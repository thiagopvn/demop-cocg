/**
 * Serviço de Notificações de Manutenção
 * Gerencia notificações do browser e verificação de manutenções próximas/atrasadas
 */

import { collection, query, where, getDocs, Timestamp, orderBy, addDoc } from 'firebase/firestore';
import db from '../firebase/db';

// Chave para armazenar configurações no localStorage
const NOTIFICATION_SETTINGS_KEY = 'maintenance_notification_settings';
const LAST_CHECK_KEY = 'maintenance_last_notification_check';
const NOTIFIED_ITEMS_KEY = 'maintenance_notified_items';

/**
 * Configurações padrão de notificação
 */
const defaultSettings = {
    enabled: true,
    daysBeforeReminder: 3, // Lembrar X dias antes
    showBrowserNotifications: true,
    checkIntervalMinutes: 30, // Verificar a cada X minutos
    notifyOverdue: true,
    notifyUpcoming: true,
    notifyToday: true,
    soundEnabled: false
};

/**
 * Obter configurações de notificação do localStorage
 */
export const getNotificationSettings = () => {
    try {
        const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
        if (stored) {
            return { ...defaultSettings, ...JSON.parse(stored) };
        }
    } catch (error) {
        console.error('Erro ao carregar configurações de notificação:', error);
    }
    return defaultSettings;
};

/**
 * Salvar configurações de notificação
 */
export const saveNotificationSettings = (settings) => {
    try {
        localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
        return true;
    } catch (error) {
        console.error('Erro ao salvar configurações de notificação:', error);
        return false;
    }
};

/**
 * Verificar se o browser suporta notificações
 */
export const isNotificationSupported = () => {
    return 'Notification' in window;
};

/**
 * Solicitar permissão para notificações
 */
export const requestNotificationPermission = async () => {
    if (!isNotificationSupported()) {
        return 'unsupported';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission === 'denied') {
        return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
};

/**
 * Enviar notificação do browser
 */
export const sendBrowserNotification = (title, options = {}) => {
    if (!isNotificationSupported() || Notification.permission !== 'granted') {
        return null;
    }

    const defaultOptions = {
        icon: '/brasao.png',
        badge: '/brasao.png',
        tag: 'maintenance-notification',
        requireInteraction: false,
        silent: false,
        ...options
    };

    try {
        const notification = new Notification(title, defaultOptions);

        notification.onclick = () => {
            window.focus();
            notification.close();
            // Navegar para a página de manutenção
            if (options.onClick) {
                options.onClick();
            } else {
                window.location.href = '/manutencao';
            }
        };

        return notification;
    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        return null;
    }
};

/**
 * Obter manutenções atrasadas
 */
export const getOverdueMaintenances = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, 'manutencoes'),
            where('status', '==', 'pendente'),
            where('dueDate', '<', Timestamp.fromDate(today)),
            orderBy('dueDate', 'asc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dueDate: doc.data().dueDate?.toDate()
        }));
    } catch (error) {
        console.error('Erro ao buscar manutenções atrasadas:', error);
        return [];
    }
};

/**
 * Obter manutenções de hoje
 */
export const getTodayMaintenances = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const q = query(
            collection(db, 'manutencoes'),
            where('status', 'in', ['pendente', 'em_andamento']),
            where('dueDate', '>=', Timestamp.fromDate(today)),
            where('dueDate', '<', Timestamp.fromDate(tomorrow))
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dueDate: doc.data().dueDate?.toDate()
        }));
    } catch (error) {
        console.error('Erro ao buscar manutenções de hoje:', error);
        return [];
    }
};

/**
 * Obter manutenções próximas (dentro do período de lembrete)
 */
export const getUpcomingMaintenances = async (daysAhead = 7) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureDate = new Date(today);
        futureDate.setDate(futureDate.getDate() + daysAhead);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const q = query(
            collection(db, 'manutencoes'),
            where('status', '==', 'pendente'),
            where('dueDate', '>=', Timestamp.fromDate(tomorrow)),
            where('dueDate', '<=', Timestamp.fromDate(futureDate)),
            orderBy('dueDate', 'asc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            dueDate: doc.data().dueDate?.toDate()
        }));
    } catch (error) {
        console.error('Erro ao buscar manutenções próximas:', error);
        return [];
    }
};

/**
 * Obter todas as manutenções pendentes (para badge)
 */
export const getPendingMaintenancesCount = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Manutenções atrasadas
        const overdueQuery = query(
            collection(db, 'manutencoes'),
            where('status', '==', 'pendente'),
            where('dueDate', '<', Timestamp.fromDate(today))
        );
        const overdueSnapshot = await getDocs(overdueQuery);

        // Manutenções de hoje
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayQuery = query(
            collection(db, 'manutencoes'),
            where('status', 'in', ['pendente', 'em_andamento']),
            where('dueDate', '>=', Timestamp.fromDate(today)),
            where('dueDate', '<', Timestamp.fromDate(tomorrow))
        );
        const todaySnapshot = await getDocs(todayQuery);

        return {
            overdue: overdueSnapshot.size,
            today: todaySnapshot.size,
            total: overdueSnapshot.size + todaySnapshot.size
        };
    } catch (error) {
        console.error('Erro ao buscar contagem de manutenções:', error);
        return { overdue: 0, today: 0, total: 0 };
    }
};

/**
 * Obter itens já notificados para evitar duplicação
 */
const getNotifiedItems = () => {
    try {
        const stored = localStorage.getItem(NOTIFIED_ITEMS_KEY);
        if (stored) {
            const items = JSON.parse(stored);
            // Limpar itens com mais de 24 horas
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            const filtered = Object.fromEntries(
                Object.entries(items).filter(([, timestamp]) => timestamp > oneDayAgo)
            );
            localStorage.setItem(NOTIFIED_ITEMS_KEY, JSON.stringify(filtered));
            return filtered;
        }
    } catch (error) {
        console.error('Erro ao carregar itens notificados:', error);
    }
    return {};
};

/**
 * Marcar item como notificado
 */
const markAsNotified = (itemId) => {
    try {
        const items = getNotifiedItems();
        items[itemId] = Date.now();
        localStorage.setItem(NOTIFIED_ITEMS_KEY, JSON.stringify(items));
    } catch (error) {
        console.error('Erro ao marcar item como notificado:', error);
    }
};

/**
 * Verificar se já passou tempo suficiente desde a última verificação
 */
const shouldCheckNow = (intervalMinutes) => {
    try {
        const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
        if (!lastCheck) return true;

        const lastCheckTime = parseInt(lastCheck, 10);
        const now = Date.now();
        const intervalMs = intervalMinutes * 60 * 1000;

        return (now - lastCheckTime) >= intervalMs;
    } catch (error) {
        return true;
    }
};

/**
 * Atualizar timestamp da última verificação
 */
const updateLastCheck = () => {
    localStorage.setItem(LAST_CHECK_KEY, Date.now().toString());
};

/**
 * Formatar data para exibição
 */
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

/**
 * Calcular dias de diferença
 */
const getDaysDifference = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
};

/**
 * Verificar manutenções e enviar notificações
 */
export const checkAndNotifyMaintenances = async (forceCheck = false) => {
    const settings = getNotificationSettings();

    if (!settings.enabled) return { notified: false, reason: 'disabled' };

    if (!forceCheck && !shouldCheckNow(settings.checkIntervalMinutes)) {
        return { notified: false, reason: 'too_soon' };
    }

    updateLastCheck();

    const notifiedItems = getNotifiedItems();
    const notifications = [];

    try {
        // Verificar manutenções atrasadas
        if (settings.notifyOverdue) {
            const overdue = await getOverdueMaintenances();
            for (const item of overdue) {
                const notifyKey = `overdue_${item.id}`;
                if (!notifiedItems[notifyKey]) {
                    const daysOverdue = Math.abs(getDaysDifference(item.dueDate));
                    notifications.push({
                        type: 'overdue',
                        title: 'Manutenção Atrasada!',
                        body: `${item.materialDescription} - Atrasada há ${daysOverdue} dia(s)`,
                        item
                    });
                    markAsNotified(notifyKey);
                }
            }
        }

        // Verificar manutenções de hoje
        if (settings.notifyToday) {
            const today = await getTodayMaintenances();
            for (const item of today) {
                const notifyKey = `today_${item.id}`;
                if (!notifiedItems[notifyKey]) {
                    notifications.push({
                        type: 'today',
                        title: 'Manutenção para Hoje!',
                        body: `${item.materialDescription} - Vence hoje`,
                        item
                    });
                    markAsNotified(notifyKey);
                }
            }
        }

        // Verificar manutenções próximas
        if (settings.notifyUpcoming) {
            const upcoming = await getUpcomingMaintenances(settings.daysBeforeReminder);
            for (const item of upcoming) {
                // Verificar se está dentro do período de lembrete configurado no próprio item
                const reminderDays = item.reminderDays || settings.daysBeforeReminder;
                const daysUntil = getDaysDifference(item.dueDate);

                if (daysUntil <= reminderDays) {
                    const notifyKey = `upcoming_${item.id}_${daysUntil}`;
                    if (!notifiedItems[notifyKey]) {
                        notifications.push({
                            type: 'upcoming',
                            title: 'Lembrete de Manutenção',
                            body: `${item.materialDescription} - Vence em ${daysUntil} dia(s) (${formatDate(item.dueDate)})`,
                            item
                        });
                        markAsNotified(notifyKey);
                    }
                }
            }
        }

        // Enviar notificações do browser
        if (settings.showBrowserNotifications && notifications.length > 0) {
            const permission = await requestNotificationPermission();
            if (permission === 'granted') {
                // Agrupar se houver muitas notificações
                if (notifications.length > 3) {
                    const overdueCount = notifications.filter(n => n.type === 'overdue').length;
                    const todayCount = notifications.filter(n => n.type === 'today').length;
                    const upcomingCount = notifications.filter(n => n.type === 'upcoming').length;

                    let body = [];
                    if (overdueCount > 0) body.push(`${overdueCount} atrasada(s)`);
                    if (todayCount > 0) body.push(`${todayCount} para hoje`);
                    if (upcomingCount > 0) body.push(`${upcomingCount} próxima(s)`);

                    sendBrowserNotification(
                        `${notifications.length} Manutenções Pendentes`,
                        { body: body.join(', '), tag: 'maintenance-summary' }
                    );
                } else {
                    // Enviar notificações individuais
                    for (const notif of notifications) {
                        sendBrowserNotification(notif.title, {
                            body: notif.body,
                            tag: `maintenance-${notif.item.id}`
                        });
                    }
                }
            }
        }

        return {
            notified: notifications.length > 0,
            count: notifications.length,
            notifications
        };
    } catch (error) {
        console.error('Erro ao verificar manutenções:', error);
        return { notified: false, reason: 'error', error };
    }
};

/**
 * Criar próxima manutenção recorrente
 */
export const createNextRecurrentMaintenance = async (completedMaintenance) => {
    if (!completedMaintenance.isRecurrent || !completedMaintenance.recurrenceType) {
        return null;
    }

    try {
        const lastDueDate = completedMaintenance.dueDate instanceof Date
            ? completedMaintenance.dueDate
            : completedMaintenance.dueDate?.toDate?.() || new Date();

        const nextDueDate = new Date(lastDueDate);

        // Calcular próxima data baseado no tipo de recorrência
        switch (completedMaintenance.recurrenceType) {
            case 'diaria':
                nextDueDate.setDate(nextDueDate.getDate() + 1);
                break;
            case 'semanal':
                nextDueDate.setDate(nextDueDate.getDate() + 7);
                break;
            case 'quinzenal':
                nextDueDate.setDate(nextDueDate.getDate() + 15);
                break;
            case 'mensal':
                nextDueDate.setMonth(nextDueDate.getMonth() + 1);
                break;
            case 'bimestral':
                nextDueDate.setMonth(nextDueDate.getMonth() + 2);
                break;
            case 'trimestral':
                nextDueDate.setMonth(nextDueDate.getMonth() + 3);
                break;
            case 'semestral':
                nextDueDate.setMonth(nextDueDate.getMonth() + 6);
                break;
            case 'anual':
                nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
                break;
            case 'customizado':
                if (completedMaintenance.customRecurrenceDays) {
                    nextDueDate.setDate(nextDueDate.getDate() + completedMaintenance.customRecurrenceDays);
                } else {
                    return null;
                }
                break;
            default:
                return null;
        }

        // Verificar se não ultrapassou a data limite (se houver)
        if (completedMaintenance.recurrenceEndDate) {
            const endDate = completedMaintenance.recurrenceEndDate instanceof Date
                ? completedMaintenance.recurrenceEndDate
                : completedMaintenance.recurrenceEndDate?.toDate?.();

            if (endDate && nextDueDate > endDate) {
                return null; // Recorrência terminou
            }
        }

        // Criar nova manutenção
        const newMaintenance = {
            materialId: completedMaintenance.materialId,
            materialDescription: completedMaintenance.materialDescription,
            materialCategory: completedMaintenance.materialCategory,
            type: completedMaintenance.type,
            dueDate: Timestamp.fromDate(nextDueDate),
            responsibleName: completedMaintenance.responsibleName,
            description: completedMaintenance.description,
            priority: completedMaintenance.priority,
            estimatedDuration: completedMaintenance.estimatedDuration,
            requiredParts: completedMaintenance.requiredParts,
            estimatedCost: completedMaintenance.estimatedCost,
            status: 'pendente',
            isRecurrent: true,
            recurrenceType: completedMaintenance.recurrenceType,
            customRecurrenceDays: completedMaintenance.customRecurrenceDays,
            recurrenceEndDate: completedMaintenance.recurrenceEndDate,
            reminderDays: completedMaintenance.reminderDays,
            parentMaintenanceId: completedMaintenance.id || completedMaintenance.parentMaintenanceId,
            recurrenceCount: (completedMaintenance.recurrenceCount || 0) + 1,
            createdAt: Timestamp.now(),
            createdBy: 'Sistema - Recorrência Automática'
        };

        const docRef = await addDoc(collection(db, 'manutencoes'), newMaintenance);

        return { id: docRef.id, ...newMaintenance };
    } catch (error) {
        console.error('Erro ao criar manutenção recorrente:', error);
        return null;
    }
};

/**
 * Obter resumo de manutenções para o dashboard
 */
export const getMaintenanceSummary = async () => {
    try {
        const [overdue, today, upcoming] = await Promise.all([
            getOverdueMaintenances(),
            getTodayMaintenances(),
            getUpcomingMaintenances(7)
        ]);

        return {
            overdue,
            today,
            upcoming,
            overdueCount: overdue.length,
            todayCount: today.length,
            upcomingCount: upcoming.length,
            totalPending: overdue.length + today.length + upcoming.length
        };
    } catch (error) {
        console.error('Erro ao obter resumo de manutenções:', error);
        return {
            overdue: [],
            today: [],
            upcoming: [],
            overdueCount: 0,
            todayCount: 0,
            upcomingCount: 0,
            totalPending: 0
        };
    }
};

export default {
    getNotificationSettings,
    saveNotificationSettings,
    isNotificationSupported,
    requestNotificationPermission,
    sendBrowserNotification,
    getOverdueMaintenances,
    getTodayMaintenances,
    getUpcomingMaintenances,
    getPendingMaintenancesCount,
    checkAndNotifyMaintenances,
    createNextRecurrentMaintenance,
    getMaintenanceSummary
};
