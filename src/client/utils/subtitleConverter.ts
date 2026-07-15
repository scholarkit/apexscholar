// Helper to download files directly in the browser
export function triggerFileDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Convert VTT format to SRT format
export function convertVttToSrt(vttText: string): string {
  let srt = vttText
    .replace(/^WEBVTT\s*\n*/, '') // Remove VTT header
    .replace(/(\d{2}:\d{2}:\d{2})\.(\d{3})/g, '$1,$2'); // Replace dot with comma in timestamps

  // Clean up remaining VTT specific tags
  srt = srt.replace(/<[^>]*>/g, '');

  return srt;
}

// Convert VTT format to plain TXT
export function convertVttToTxt(vttText: string): string {
  return vttText
    .replace(/^WEBVTT\s*\n*/, '')
    // Strip timestamps (e.g., 00:01:23.456 --> 00:01:25.789)
    .replace(/\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/g, '')
    // Strip WebVTT style blocks/formatting
    .replace(/STYLE[\s\S]*?^$/gm, '')
    .replace(/NOTE[\s\S]*?^$/gm, '')
    .replace(/<[^>]*>/g, '')
    // Remove sequence numbers if present
    .replace(/^\d+$/gm, '')
    // Clean up excessive whitespace & multiple consecutive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
