export async function getErrorMessage(response: Response): Promise<string> {
  const statusText = response.statusText;
  
  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return data.message || statusText;
    }
  } catch {
    // JSON parsing failed
  }
  
  try {
    const text = await response.text();
    return text || statusText;
  } catch {
    return statusText;
  }
}