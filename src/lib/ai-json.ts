// Some OpenRouter-hosted models (Claude in particular) still wrap JSON output
// in a ```json ... ``` markdown fence even when response_format is set to
// json_object — a plain JSON.parse on that throws, which several call sites
// treated as "we got no output" and silently fell back to a permanent-looking
// error. Stripping the fence before parsing fixes the actual failure instead
// of just handling it more gracefully.
export function parseAiJson<T>(raw: string): T | null {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}
