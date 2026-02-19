/**
 * Utilitário centralizado para tratamento de erros HTTP
 * Converte erros do Axios em mensagens amigáveis para o usuário
 */

export function getErrorMessage(error: any): string {
  // Erro de rede ou timeout
  if (!error.response) {
    if (error.code === 'ECONNABORTED') {
      return 'Tempo esgotado. Verifique sua conexão e tente novamente.';
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Erro de conexão. Verifique sua internet.';
    }
    return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
  }
  
  const status = error.response.status;
  const detail = error.response.data?.detail;
  
  // Tratamento específico por status HTTP
  switch (status) {
    case 400:
      return detail || 'Dados inválidos. Verifique os campos e tente novamente.';
    
    case 401:
      return 'Sessão expirada. Você será redirecionado para o login.';
    
    case 403:
      return 'Você não tem permissão para realizar esta ação.';
    
    case 404:
      return 'Recurso não encontrado. Verifique se o item ainda existe.';
    
    case 422:
      // Validation error - tentar extrair detalhes
      if (error.response.data?.errors) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        return Array.isArray(firstError) ? firstError[0] : String(firstError);
      }
      return detail || 'Dados inválidos. Verifique os campos e tente novamente.';
    
    case 429:
      return 'Muitas tentativas. Aguarde um momento e tente novamente.';
    
    case 500:
      return 'Erro interno do servidor. Tente novamente mais tarde.';
    
    case 502:
      return 'Servidor temporariamente indisponível. Tente novamente em alguns instantes.';
    
    case 503:
      return 'Serviço em manutenção. Tente novamente em alguns minutos.';
    
    case 504:
      return 'Tempo de resposta esgotado. O servidor está demorando muito para responder.';
    
    default:
      return detail || `Erro ${status}. Tente novamente.`;
  }
}

/**
 * Verifica se o erro é de autenticação (401)
 */
export function isAuthError(error: any): boolean {
  return error.response?.status === 401;
}

/**
 * Verifica se o erro é de permissão (403)
 */
export function isPermissionError(error: any): boolean {
  return error.response?.status === 403;
}

/**
 * Verifica se o erro é de validação (422)
 */
export function isValidationError(error: any): boolean {
  return error.response?.status === 422;
}

/**
 * Verifica se o erro é de rate limiting (429)
 */
export function isRateLimitError(error: any): boolean {
  return error.response?.status === 429;
}

/**
 * Verifica se o erro é de servidor (5xx)
 */
export function isServerError(error: any): boolean {
  const status = error.response?.status;
  return status >= 500 && status < 600;
}

/**
 * Verifica se o erro é de timeout
 */
export function isTimeoutError(error: any): boolean {
  return error.code === 'ECONNABORTED' || error.response?.status === 504;
}
