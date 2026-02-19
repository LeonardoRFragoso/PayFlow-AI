"""
Utilitário para sanitizar dados sensíveis em logs
Previne vazamento de informações de PCI-DSS e LGPD
"""
from typing import Any, Dict, List


SENSITIVE_FIELDS = [
    'password',
    'token',
    'secret',
    'api_key',
    'access_token',
    'refresh_token',
    'card_number',
    'cvv',
    'cvc',
    'security_code',
    'ssn',
    'cpf',
    'credit_card',
    'card_holder',
    'email',  # Opcional: pode ser sensível dependendo do contexto
    'phone',
    'phone_number',
    'address',
]


def sanitize_dict(data: Dict[str, Any], fields_to_keep: List[str] = None) -> Dict[str, Any]:
    """
    Sanitiza dicionário removendo campos sensíveis
    
    Args:
        data: Dicionário a ser sanitizado
        fields_to_keep: Lista de campos que devem ser mantidos (ex: ['id', 'type'])
    
    Returns:
        Dicionário sanitizado
    """
    if not isinstance(data, dict):
        return data
    
    sanitized = {}
    fields_to_keep = fields_to_keep or ['id', 'type', 'status', 'action']
    
    for key, value in data.items():
        # Manter apenas campos permitidos
        if key.lower() in [f.lower() for f in fields_to_keep]:
            if isinstance(value, dict):
                sanitized[key] = sanitize_dict(value, fields_to_keep)
            elif isinstance(value, list):
                sanitized[key] = [
                    sanitize_dict(item, fields_to_keep) if isinstance(item, dict) else '***'
                    for item in value
                ]
            else:
                sanitized[key] = value
        # Redact campos sensíveis
        elif any(sensitive in key.lower() for sensitive in SENSITIVE_FIELDS):
            sanitized[key] = '***REDACTED***'
        # Sanitizar recursivamente
        elif isinstance(value, dict):
            sanitized[key] = sanitize_dict(value, fields_to_keep)
        elif isinstance(value, list):
            sanitized[key] = [
                sanitize_dict(item, fields_to_keep) if isinstance(item, dict) else '***'
                for item in value
            ]
        else:
            # Outros campos: redact por segurança
            sanitized[key] = '***'
    
    return sanitized


def sanitize_webhook_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitiza dados de webhook para logging seguro
    Mantém apenas informações essenciais para debug
    """
    return sanitize_dict(data, fields_to_keep=['id', 'type', 'action', 'status', 'event_type'])


def sanitize_payment_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitiza dados de pagamento para logging
    Remove completamente informações de cartão
    """
    safe_fields = ['id', 'status', 'amount', 'currency', 'payment_method_type']
    return sanitize_dict(data, fields_to_keep=safe_fields)


def sanitize_user_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitiza dados de usuário para logging
    Remove informações pessoais (LGPD)
    """
    safe_fields = ['id', 'created_at', 'plan']
    return sanitize_dict(data, fields_to_keep=safe_fields)
