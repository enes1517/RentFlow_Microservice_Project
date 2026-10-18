namespace SharedKernel.Common;

/// <summary>
/// Hata bilgisini taşıyan immutable record.
/// </summary>
public sealed record Error(string Code, string Message)
{
    public static readonly Error None = new(string.Empty, string.Empty);
    public static readonly Error NotFound = new("NOT_FOUND", "Kayıt bulunamadı.");
    public static readonly Error Unauthorized = new("UNAUTHORIZED", "Bu işlem için yetkiniz yok.");
    public static readonly Error Forbidden = new("FORBIDDEN", "Bu kaynağa erişim yasak.");
    public static readonly Error Conflict = new("CONFLICT", "Kayıt zaten mevcut.");
    public static readonly Error ValidationFailed = new("VALIDATION_FAILED", "Doğrulama başarısız.");

    public static Error Custom(string code, string message) => new(code, message);
}

/// <summary>
/// Başarı veya hata durumunu saran Result pattern implementasyonu.
/// Railway-Oriented Programming için kullanılır.
/// </summary>
public class Result
{
    protected Result(bool isSuccess, Error error)
    {
        if (isSuccess && error != Error.None)
            throw new InvalidOperationException("Başarılı sonuç hata içeremez.");
        if (!isSuccess && error == Error.None)
            throw new InvalidOperationException("Başarısız sonuç hata içermelidir.");

        IsSuccess = isSuccess;
        Error = error;
    }

    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public Error Error { get; }

    public static Result Success() => new(true, Error.None);
    public static Result Failure(Error error) => new(false, error);
    public static Result<TValue> Success<TValue>(TValue value) => new(value, true, Error.None);
    public static Result<TValue> Failure<TValue>(Error error) => new(default, false, error);
}

/// <summary>
/// Generic Result — Değer döndüren işlemler için kullanılır.
/// </summary>
public class Result<TValue> : Result
{
    private readonly TValue? _value;

    internal Result(TValue? value, bool isSuccess, Error error) : base(isSuccess, error)
    {
        _value = value;
    }

    /// <summary>
    /// Başarılı sonuç değeri. Başarısız durumda InvalidOperationException fırlatır.
    /// </summary>
    public TValue Value => IsSuccess
        ? _value!
        : throw new InvalidOperationException("Başarısız sonuçtan değer alınamaz.");

    public static implicit operator Result<TValue>(TValue value) => Success(value);
}
