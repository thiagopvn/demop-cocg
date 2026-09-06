import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/db';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB antes da compressao

/**
 * Comprime e redimensiona uma imagem via Canvas, devolvendo um File JPEG.
 * `maxDimension` limita o maior lado (fotos de perfil usam 512px).
 */
export const compressImage = (file, { maxDimension = 1200, quality = 0.82 } = {}) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            let { width, height } = img;
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) return reject(new Error('Falha ao comprimir imagem'));
                    resolve(new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
                },
                'image/jpeg',
                quality
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Erro ao carregar imagem'));
        };
        img.src = url;
    });

/**
 * Recorta a imagem em quadrado (centro) e redimensiona — ideal para foto de perfil.
 */
export const compressAvatar = (file, size = 512) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const lado = Math.min(img.width, img.height);
            const sx = Math.round((img.width - lado) / 2);
            const sy = Math.round((img.height - lado) / 2);
            const destino = Math.min(size, lado);
            const canvas = document.createElement('canvas');
            canvas.width = destino;
            canvas.height = destino;
            canvas.getContext('2d').drawImage(img, sx, sy, lado, lado, 0, 0, destino, destino);
            canvas.toBlob(
                (blob) => {
                    if (!blob) return reject(new Error('Falha ao processar a foto'));
                    resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg', lastModified: Date.now() }));
                },
                'image/jpeg',
                0.85
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Erro ao carregar a foto'));
        };
        img.src = url;
    });

/** Envia um arquivo para o Storage e devolve { downloadURL, storagePath }. */
export const uploadImageFile = (file, storagePath, onProgress) =>
    new Promise((resolve, reject) => {
        const storageRef = ref(storage, storagePath);
        const task = uploadBytesResumable(storageRef, file, { contentType: file.type });
        task.on(
            'state_changed',
            (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            reject,
            async () => {
                try {
                    resolve({ downloadURL: await getDownloadURL(task.snapshot.ref), storagePath });
                } catch (e) {
                    reject(e);
                }
            }
        );
    });

/** Apaga um arquivo do Storage ignorando "nao encontrado". */
export const deleteStorageFile = async (path) => {
    if (!path) return;
    try {
        await deleteObject(ref(storage, path));
    } catch {
        // arquivo ja nao existe
    }
};

export const validarImagem = (file) => {
    if (!file) return 'Nenhum arquivo selecionado.';
    const tipoOk = ACCEPTED_IMAGE_TYPES.includes(file.type) || /\.(heic|heif|jpe?g|png|webp)$/i.test(file.name);
    if (!tipoOk) return 'Formato não suportado. Use JPG, PNG, WEBP ou HEIC.';
    if (file.size > MAX_IMAGE_SIZE) return 'Imagem muito grande (máx. 20MB).';
    return null;
};
