import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import Papa from 'papaparse';
import { Ionicons } from '@expo/vector-icons';
import { useCategoryStore } from '../../src/stores/useCategoryStore';
import { useTransactionStore } from '../../src/stores/useTransactionStore';
import { getExistingImportHashes } from '../../src/db/queries/transactions';
import {
  detectColumns,
  guessCategory,
  parseAmount,
  parseDate,
  computeImportHash,
  type ColumnMapping,
} from '../../src/utils/csvMappers';
import { formatCurrency } from '../../src/utils/currency';
import { formatDate } from '../../src/utils/dateHelpers';

type Step = 'pick' | 'mapping' | 'review' | 'done';

interface ParsedRow {
  date: number;
  amount: number;
  merchant: string;
  type: 'expense' | 'income';
  categoryId: number | null;
  categoryName: string | null;
  importHash: string;
  isDuplicate: boolean;
}

export default function ImportCsvModal() {
  const { categories } = useCategoryStore();
  const { addTransaction, fetchTransactions } = useTransactionStore();

  const [step, setStep] = useState<Step>('pick');
  const [loading, setLoading] = useState(false);

  // CSV raw data
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    dateCol: null, amountCol: null, debitCol: null, creditCol: null, merchantCol: null,
  });

  // Parsed rows for review
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importCount, setImportCount] = useState(0);
  const [dupCount, setDupCount] = useState(0);

  async function handlePickFile() {
    try {
      setLoading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;

      const file = result.assets[0];
      const response = await fetch(file.uri);
      const text = await response.text();

      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.data.length === 0) {
        Alert.alert('Empty file', 'No data found in this CSV file.');
        return;
      }

      const detectedHeaders = parsed.meta.fields ?? [];
      setHeaders(detectedHeaders);
      setRawRows(parsed.data);

      const detected = detectColumns(detectedHeaders);
      setMapping(detected);
      setStep('mapping');
    } catch (e) {
      Alert.alert('Error', 'Could not read the file.');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmMapping() {
    setLoading(true);
    try {
      const rows: ParsedRow[] = [];
      const categoryNameMap = new Map(categories.map((c) => [c.name, c.id]));

      for (const row of rawRows) {
        const dateRaw = mapping.dateCol ? row[mapping.dateCol] : null;
        const date = dateRaw ? parseDate(dateRaw) : null;
        if (!date) continue;

        let amount = 0;
        let type: 'expense' | 'income' = 'expense';

        if (mapping.debitCol && mapping.creditCol) {
          const debit = parseAmount(row[mapping.debitCol] ?? '0');
          const credit = parseAmount(row[mapping.creditCol] ?? '0');
          if (credit > 0) { amount = credit; type = 'income'; }
          else { amount = debit; type = 'expense'; }
        } else if (mapping.amountCol) {
          const raw = row[mapping.amountCol] ?? '0';
          amount = parseAmount(raw);
          // Negative amounts = income in some banks
          const numericRaw = parseFloat(raw.replace(/[$,\s]/g, ''));
          type = numericRaw < 0 ? 'income' : 'expense';
        }

        if (amount === 0) continue;

        const merchant = mapping.merchantCol ? (row[mapping.merchantCol] ?? '').trim() : '';
        const importHash = computeImportHash(date, amount, merchant);
        const guessedCatName = guessCategory(merchant);
        const categoryId = guessedCatName ? (categoryNameMap.get(guessedCatName) ?? null) : null;

        rows.push({
          date,
          amount,
          merchant,
          type,
          categoryId,
          categoryName: guessedCatName,
          importHash,
          isDuplicate: false,
        });
      }

      // Check for duplicates
      const hashes = rows.map((r) => r.importHash);
      const existing = await getExistingImportHashes(hashes);
      const existingSet = new Set(existing.map((e) => e.importHash).filter(Boolean) as string[]);

      const withDup = rows.map((r) => ({
        ...r,
        isDuplicate: existingSet.has(r.importHash),
      }));

      const toImport = withDup.filter((r) => !r.isDuplicate);
      setParsedRows(withDup);
      setImportCount(toImport.length);
      setDupCount(withDup.length - toImport.length);
      setStep('review');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setLoading(true);
    try {
      const toImport = parsedRows.filter((r) => !r.isDuplicate);
      for (const row of toImport) {
        await addTransaction({
          amount: row.amount,
          type: row.type,
          categoryId: row.categoryId,
          merchant: row.merchant || null,
          note: null,
          date: row.date,
          isRecurring: 0,
          source: 'csv_import',
          importHash: row.importHash,
        });
      }
      setStep('done');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'pick') {
    return (
      <View style={styles.centered}>
        <Ionicons name="document-text-outline" size={64} color="#C7C7CC" />
        <Text style={styles.pickTitle}>Import from CSV</Text>
        <Text style={styles.pickSubtitle}>
          Download your bank's transaction export (CSV format) and select it here.
        </Text>
        <TouchableOpacity style={styles.pickButton} onPress={handlePickFile} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="folder-open-outline" size={20} color="#fff" />
              <Text style={styles.pickButtonText}>Choose File</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'mapping') {
    const cols = ['(none)', ...headers];
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.mappingContent}>
        <Text style={styles.stepTitle}>Map Columns</Text>
        <Text style={styles.stepSubtitle}>
          We detected {rawRows.length} rows. Confirm which column is which.
        </Text>

        {[
          { label: 'Date column', key: 'dateCol' as keyof ColumnMapping },
          { label: 'Amount column', key: 'amountCol' as keyof ColumnMapping },
          { label: 'Debit column (optional)', key: 'debitCol' as keyof ColumnMapping },
          { label: 'Credit column (optional)', key: 'creditCol' as keyof ColumnMapping },
          { label: 'Merchant / Description', key: 'merchantCol' as keyof ColumnMapping },
        ].map(({ label, key }) => (
          <View key={key} style={styles.mappingRow}>
            <Text style={styles.mappingLabel}>{label}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {cols.map((col) => (
                <TouchableOpacity
                  key={col}
                  style={[
                    styles.colChip,
                    (mapping[key] === col || (col === '(none)' && !mapping[key])) &&
                      styles.colChipActive,
                  ]}
                  onPress={() =>
                    setMapping((prev) => ({ ...prev, [key]: col === '(none)' ? null : col }))
                  }
                >
                  <Text
                    style={[
                      styles.colChipText,
                      (mapping[key] === col || (col === '(none)' && !mapping[key])) &&
                        styles.colChipTextActive,
                    ]}
                  >
                    {col}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleConfirmMapping}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Continue →</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === 'review') {
    const preview = parsedRows.filter((r) => !r.isDuplicate).slice(0, 10);
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.mappingContent}>
        <Text style={styles.stepTitle}>Review Import</Text>
        <View style={styles.reviewSummary}>
          <Text style={styles.reviewSummaryText}>
            {importCount} transactions to import
          </Text>
          {dupCount > 0 && (
            <Text style={styles.reviewDupText}>{dupCount} duplicates skipped</Text>
          )}
        </View>

        {preview.map((row, i) => (
          <View key={i} style={styles.previewRow}>
            <View style={styles.previewLeft}>
              <Text style={styles.previewMerchant} numberOfLines={1}>
                {row.merchant || 'Unknown'}
              </Text>
              <Text style={styles.previewDate}>{formatDate(row.date)}</Text>
              {row.categoryName && (
                <Text style={styles.previewCat}>{row.categoryName}</Text>
              )}
            </View>
            <Text style={[styles.previewAmount, { color: row.type === 'expense' ? '#FF3B30' : '#34C759' }]}>
              {row.type === 'expense' ? '-' : '+'}{formatCurrency(row.amount)}
            </Text>
          </View>
        ))}

        {importCount > 10 && (
          <Text style={styles.moreText}>...and {importCount - 10} more</Text>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleImport}
          disabled={loading || importCount === 0}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>Import {importCount} Transactions</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep('mapping')}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Done
  return (
    <View style={styles.centered}>
      <Ionicons name="checkmark-circle" size={72} color="#34C759" />
      <Text style={styles.doneTitle}>Import Complete</Text>
      <Text style={styles.doneSubtitle}>{importCount} transactions imported successfully.</Text>
      <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()}>
        <Text style={styles.primaryButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  pickTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  pickSubtitle: { fontSize: 15, color: '#8E8E93', textAlign: 'center', lineHeight: 22 },
  pickButton: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#4F9DDE',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginTop: 8,
  },
  pickButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  mappingContent: { padding: 16, gap: 16 },
  stepTitle: { fontSize: 20, fontWeight: '700' },
  stepSubtitle: { fontSize: 14, color: '#8E8E93' },
  mappingRow: { gap: 8 },
  mappingLabel: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 },
  colChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    marginRight: 6,
  },
  colChipActive: { backgroundColor: '#4F9DDE' },
  colChipText: { fontSize: 13, color: '#8E8E93' },
  colChipTextActive: { color: '#fff', fontWeight: '600' },
  primaryButton: {
    backgroundColor: '#4F9DDE',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
    marginTop: 8,
  },
  secondaryButtonText: { color: '#4F9DDE', fontSize: 17 },
  reviewSummary: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    gap: 4,
  },
  reviewSummaryText: { fontSize: 17, fontWeight: '600' },
  reviewDupText: { fontSize: 14, color: '#8E8E93' },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  previewLeft: { flex: 1, gap: 2 },
  previewMerchant: { fontSize: 14, color: '#000' },
  previewDate: { fontSize: 12, color: '#8E8E93' },
  previewCat: { fontSize: 11, color: '#4F9DDE' },
  previewAmount: { fontSize: 14, fontWeight: '600' },
  moreText: { textAlign: 'center', color: '#8E8E93', fontSize: 13, paddingVertical: 8 },
  doneTitle: { fontSize: 24, fontWeight: '700' },
  doneSubtitle: { fontSize: 16, color: '#8E8E93', textAlign: 'center' },
});
