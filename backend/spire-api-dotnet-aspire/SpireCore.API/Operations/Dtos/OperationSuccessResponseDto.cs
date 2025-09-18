namespace SpireCore.API.Operations.Dtos;

public sealed class OperationSuccessResponseDto
{
    public bool Success { get; set; }
    public OperationSuccessResponseDto() { }
    public OperationSuccessResponseDto(bool success) => Success = success;
}