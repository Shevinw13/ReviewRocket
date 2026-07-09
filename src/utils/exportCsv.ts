/**
 * CSV export utility for feedback history.
 * Generates a CSV file and opens the native share sheet.
 */

import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { ReviewRequest } from '@/types';

/**
 * Export review requests as a CSV file and open the share sheet.
 */
export async function exportFeedbackCsv(requests: ReviewRequest[]): Promise<void> {
  // CSV header
  const header = 'Customer Name,Phone,Rating,Status,Job Note,Date Sent\n';

  // CSV rows
  const rows = requests.map((r) => {
    const name = (r.customerName || 'Customer').replace(/,/g, ' ');
    const phone = r.customerPhone || '';
    const rating = r.rating != null ? `${r.rating}/5` : 'N/A';
    const status = getStatusText(r);
    const jobNote = (r.serviceType || '').replace(/,/g, ' ');
    const date = new Date(r.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${name},${phone},${rating},${status},${jobNote},${date}`;
  });

  const csv = header + rows.join('\n');

  // Write to cache file
  const fileName = `nudgli-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
  const file = new File(Paths.cache, fileName);
  await file.write(csv);

  // Open share sheet
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export Feedback',
      UTI: 'public.comma-separated-values-text',
    });
  }
}

function getStatusText(request: ReviewRequest): string {
  if (request.rating != null && request.rating >= 4) return 'Positive';
  if (request.rating != null && request.rating <= 3) return 'Needs Follow-up';
  if (request.status === 'sent' || request.status === 'delivered') return 'Awaiting Reply';
  if (request.status === 'expired') return 'No Response';
  if (request.status === 'failed') return 'Failed';
  return 'Sent';
}
