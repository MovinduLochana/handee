namespace handee.API.Exceptions;

/// <summary>Thrown when a business validation rule is violated (maps to 400).</summary>
public class ValidationException(string message) : Exception(message);

/// <summary>Thrown for invalid credentials or bad tokens (maps to 401).</summary>
public class UnauthorizedException(string message) : Exception(message);

/// <summary>Thrown when a locked-out account attempts login (maps to 423).</summary>
public class AccountLockedException(string message) : Exception(message);

/// <summary>Thrown when a resource cannot be found (maps to 404).</summary>
public class NotFoundException(string message) : Exception(message);

/// <summary>Thrown when an authenticated, identified party lacks permission for the requested action (maps to 403).</summary>
public class ForbiddenException(string message) : Exception(message);
