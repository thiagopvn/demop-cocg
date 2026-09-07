/**
 * Política de senha forte: letras E números, mínimo 8 caracteres.
 * Devolve a mensagem de erro (na ordem pedida: primeiro letras/números, depois tamanho) ou null se estiver ok.
 * A regra não é anunciada na tela; só aparece quando a senha digitada não atende.
 */
export function validarSenhaForte(senha) {
    const s = String(senha || '');
    if (!s) return 'Informe a nova senha.';
    const temLetra = /[A-Za-zÀ-ÿ]/.test(s);
    const temNumero = /\d/.test(s);
    if (!temLetra || !temNumero) return 'A senha deve conter números e letras.';
    if (s.length < 8) return 'A senha deve ter no mínimo 8 caracteres.';
    return null;
}

export const senhaEhForte = (senha) => validarSenhaForte(senha) === null;
