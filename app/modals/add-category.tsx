import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCategoryStore } from '../../src/stores/useCategoryStore';

const PRESET_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7',
  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4',
  '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  '#FFC107', '#FF9800', '#FF5722', '#607D8B',
];

const PRESET_ICONS: Array<React.ComponentProps<typeof Ionicons>['name']> = [
  'basket-outline', 'fast-food-outline', 'car-outline', 'home-outline',
  'flash-outline', 'film-outline', 'heart-outline', 'bag-outline',
  'cash-outline', 'swap-horizontal-outline', 'airplane-outline', 'barbell-outline',
  'book-outline', 'cafe-outline', 'game-controller-outline', 'gift-outline',
  'medkit-outline', 'phone-portrait-outline', 'restaurant-outline', 'school-outline',
  'shirt-outline', 'wifi-outline', 'wine-outline', 'people-outline',
];

export default function AddCategoryModal() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { categories, addCategory, updateCategory, deleteCategory } = useCategoryStore();

  const existing = id ? categories.find((c) => c.id === parseInt(id)) : null;

  const [name, setName] = useState(existing?.name ?? '');
  const [color, setColor] = useState(existing?.color ?? '#4F9DDE');
  const [icon, setIcon] = useState<string>(existing?.icon ?? 'basket-outline');
  const [budgetLimit, setBudgetLimit] = useState(
    existing?.budgetLimit != null ? existing.budgetLimit.toString() : ''
  );
  const [isIncome, setIsIncome] = useState(existing?.isIncome === 1);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a category name.');
      return;
    }
    const data = {
      name: name.trim(),
      color,
      icon,
      budgetLimit: budgetLimit ? parseFloat(budgetLimit) : null,
      isIncome: isIncome ? 1 : 0,
      sortOrder: existing?.sortOrder ?? 99,
    };
    if (existing) {
      await updateCategory(existing.id, data);
    } else {
      await addCategory(data);
    }
    router.back();
  }

  async function handleDelete() {
    Alert.alert('Delete Category', `Delete "${name}"? This won't delete existing transactions.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCategory(existing!.id);
          router.back();
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Groceries"
          placeholderTextColor="#C7C7CC"
          returnKeyType="done"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.switchRow}>
          <Text style={styles.label}>Income category</Text>
          <Switch value={isIncome} onValueChange={setIsIncome} trackColor={{ true: '#34C759' }} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Budget Limit (monthly)</Text>
        <TextInput
          style={styles.input}
          value={budgetLimit}
          onChangeText={setBudgetLimit}
          placeholder="No limit"
          placeholderTextColor="#C7C7CC"
          keyboardType="decimal-pad"
          returnKeyType="done"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Color</Text>
        <View style={styles.colorGrid}>
          {PRESET_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.selectedSwatch]}
              onPress={() => setColor(c)}
            >
              {color === c && <Ionicons name="checkmark" size={14} color="#fff" />}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Icon</Text>
        <View style={styles.iconGrid}>
          {PRESET_ICONS.map((ic) => (
            <TouchableOpacity
              key={ic}
              style={[styles.iconButton, icon === ic && { backgroundColor: color + '22', borderColor: color }]}
              onPress={() => setIcon(ic)}
            >
              <Ionicons name={ic} size={22} color={icon === ic ? color : '#8E8E93'} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>{existing ? 'Save Changes' : 'Add Category'}</Text>
      </TouchableOpacity>

      {existing && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Category</Text>
        </TouchableOpacity>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
    gap: 8,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 4 },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSwatch: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 4 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  saveButton: {
    margin: 16,
    backgroundColor: '#4F9DDE',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  deleteButton: {
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#FF3B30',
  },
  deleteButtonText: { color: '#FF3B30', fontSize: 17, fontWeight: '600' },
});
