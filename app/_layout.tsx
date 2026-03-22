import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initDatabase } from '../src/db/client';
import { useAppInit } from '../src/hooks/useAppInit';

// Run synchronously before any component mounts so DB tables exist for all queries
initDatabase();

export default function RootLayout() {

  useAppInit();

  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modals/add-transaction"
          options={{ presentation: 'modal', title: 'Add Transaction' }}
        />
        <Stack.Screen
          name="modals/add-category"
          options={{ presentation: 'modal', title: 'Category' }}
        />
        <Stack.Screen
          name="modals/import-csv"
          options={{ presentation: 'modal', title: 'Import CSV' }}
        />
        <Stack.Screen
          name="modals/transaction-detail"
          options={{ presentation: 'modal', title: 'Transaction' }}
        />
        <Stack.Screen
          name="modals/add-recurring-bill"
          options={{ presentation: 'modal', title: 'Recurring Bill' }}
        />
        <Stack.Screen
          name="modals/add-account"
          options={{ presentation: 'modal', title: 'Account' }}
        />
      </Stack>
    </>
  );
}
