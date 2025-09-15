using System.Text.Json;
using System.Text.Json.Serialization;

public class EmptyListConverter<T> : JsonConverter<List<T>>
{
    public override List<T>? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        => JsonSerializer.Deserialize<List<T>>(ref reader, options);

    public override void Write(Utf8JsonWriter writer, List<T>? value, JsonSerializerOptions options)
    {
        if (value is { Count: > 0 })
            JsonSerializer.Serialize(writer, value, options);
        // else: skip writing (property will be omitted if [JsonIgnore(Condition = WhenWritingNull)] is set on property)
    }
}
