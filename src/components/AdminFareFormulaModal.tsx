import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  SafeAreaView,
} from 'react-native';
import Icon from './AppIcon';
import {
  FareFormulaConfig,
  getFareFormulaConfig,
  saveFareFormulaConfig,
  calculatePassengerFare,
  DEFAULT_FARE_FORMULA,
} from '../services/fareCalculationService';
import { showThemedAlert } from '../context/AlertContext';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';

interface AdminFareFormulaModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (config: FareFormulaConfig) => void;
}

export const AdminFareFormulaModal: React.FC<AdminFareFormulaModalProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const { theme } = useTheme();
  const { getTextStyle } = useLanguage();

  const [config, setConfig] = useState<FareFormulaConfig>(DEFAULT_FARE_FORMULA);
  const [fuelPrice, setFuelPrice] = useState<string>('344');
  const [tollGTRoad, setTollGTRoad] = useState<string>('200');
  const [tollCPEC, setTollCPEC] = useState<string>('360');
  const [mileageBelowNonAC, setMileageBelowNonAC] = useState<string>('15');
  const [mileageBelowAC, setMileageBelowAC] = useState<string>('13.5');
  const [mileageAboveNonAC, setMileageAboveNonAC] = useState<string>('14.5');
  const [mileageAboveAC, setMileageAboveAC] = useState<string>('13');
  const [passengers, setPassengers] = useState<string>('4');

  // Preview test distance
  const [testDistanceKm, setTestDistanceKm] = useState<string>('200');

  useEffect(() => {
    if (visible) {
      getFareFormulaConfig().then((cfg) => {
        setConfig(cfg);
        setFuelPrice(String(cfg.fuelPricePerLiter));
        setTollGTRoad(String(cfg.tollCharges.gt_road));
        setTollCPEC(String(cfg.tollCharges.cpec));
        setMileageBelowNonAC(String(cfg.mileage.below_1000cc_non_ac));
        setMileageBelowAC(String(cfg.mileage.below_1000cc_ac || '13.5'));
        setMileageAboveNonAC(String(cfg.mileage.above_1000cc_non_ac || '14.5'));
        setMileageAboveAC(String(cfg.mileage.above_1000cc_ac));
        setPassengers(String(cfg.passengerCapacity));
      });
    }
  }, [visible]);

  const handleSave = async () => {
    const updated: FareFormulaConfig = {
      fuelPricePerLiter: parseFloat(fuelPrice) || 344,
      passengerCapacity: parseInt(passengers, 10) || 4,
      tollCharges: {
        gt_road: parseFloat(tollGTRoad) || 200,
        cpec: parseFloat(tollCPEC) || 360,
      },
      mileage: {
        below_1000cc_non_ac: parseFloat(mileageBelowNonAC) || 15,
        below_1000cc_ac: parseFloat(mileageBelowAC) || 13.5,
        above_1000cc_non_ac: parseFloat(mileageAboveNonAC) || 14.5,
        above_1000cc_ac: parseFloat(mileageAboveAC) || 13,
      },
    };

    await saveFareFormulaConfig(updated);
    if (onSaved) onSaved(updated);
    showThemedAlert(
      'Fare Formula Updated! ⛽',
      'Fuel prices, AC/Non-AC mileage, and toll charges have been updated. All passenger trip fares will now calculate using the new rates.',
      undefined,
      { type: 'success', iconName: 'check-decagram', autoDismissMs: 4000 }
    );
    onClose();
  };

  // Real-time Preview calculations based on test distance
  const currentTestConfig: FareFormulaConfig = {
    fuelPricePerLiter: parseFloat(fuelPrice) || 344,
    passengerCapacity: parseInt(passengers, 10) || 4,
    tollCharges: {
      gt_road: parseFloat(tollGTRoad) || 200,
      cpec: parseFloat(tollCPEC) || 360,
    },
    mileage: {
      below_1000cc_non_ac: parseFloat(mileageBelowNonAC) || 15,
      below_1000cc_ac: parseFloat(mileageBelowAC) || 13.5,
      above_1000cc_non_ac: parseFloat(mileageAboveNonAC) || 14.5,
      above_1000cc_ac: parseFloat(mileageAboveAC) || 13,
    },
  };

  const dist = parseFloat(testDistanceKm) || 200;
  // 4 Official Chart Configurations:
  // 1. Cars Below 1000 CC without AC and Trunk Via GT Road
  const preview1 = calculatePassengerFare(dist, 'below_1000cc', false, 'gt_road', currentTestConfig);
  // 2. Cars Below 1000 CC without AC and Trunk Via CPEC
  const preview2 = calculatePassengerFare(dist, 'below_1000cc', false, 'cpec', currentTestConfig);
  // 3. Cars 1000 CC and above with AC and Trunk Via GT Road
  const preview3 = calculatePassengerFare(dist, 'above_1000cc', true, 'gt_road', currentTestConfig);
  // 4. Cars 1000 CC and above with AC and Trunk Via CPEC
  const preview4 = calculatePassengerFare(dist, 'above_1000cc', true, 'cpec', currentTestConfig);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Icon name="arrow-left" size={20} color="#262A27" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={[styles.headerTitle, getTextStyle()]}>Admin Fare & Fuel Configuration</Text>
            <Text style={styles.headerSubtitle}>Official Per-Head Distance Formula</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Section 1: Fuel & Passenger Constants */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="banknote" size={18} color="#2F9A3C" />
              <Text style={styles.cardTitle}>Fuel Price & Capacity</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Fuel Price per Liter (Rs.) *</Text>
              <View style={styles.inputRow}>
                <Text style={styles.inputPrefix}>Rs.</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={fuelPrice}
                  onChangeText={setFuelPrice}
                  placeholder="344"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>No. of Passengers (Vehicle Capacity) *</Text>
              <TextInput
                style={[styles.textInput, { paddingLeft: 14 }]}
                keyboardType="numeric"
                value={passengers}
                onChangeText={setPassengers}
                placeholder="4"
              />
            </View>
          </View>

          {/* Section 2: Toll Charges */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="routes" size={18} color="#2F9A3C" />
              <Text style={styles.cardTitle}>Toll Charges (Rs.)</Text>
            </View>

            <View style={styles.rowTwoCols}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>GT Road Toll (Rs.)</Text>
                <TextInput
                  style={[styles.textInput, { paddingLeft: 14 }]}
                  keyboardType="numeric"
                  value={tollGTRoad}
                  onChangeText={setTollGTRoad}
                  placeholder="200"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>CPEC / Motorway Toll</Text>
                <TextInput
                  style={[styles.textInput, { paddingLeft: 14 }]}
                  keyboardType="numeric"
                  value={tollCPEC}
                  onChangeText={setTollCPEC}
                  placeholder="360"
                />
              </View>
            </View>
          </View>

          {/* Section 3: Vehicle Mileage Configuration (With & Without AC) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="car" size={18} color="#2F9A3C" />
              <Text style={styles.cardTitle}>Average Mileage (KM / Liter)</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cars Below 1000 CC (Without AC) - KM/L</Text>
              <TextInput
                style={[styles.textInput, { paddingLeft: 14 }]}
                keyboardType="numeric"
                value={mileageBelowNonAC}
                onChangeText={setMileageBelowNonAC}
                placeholder="15"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cars 1000 CC & Above (With AC) - KM/L</Text>
              <TextInput
                style={[styles.textInput, { paddingLeft: 14 }]}
                keyboardType="numeric"
                value={mileageAboveAC}
                onChangeText={setMileageAboveAC}
                placeholder="13"
              />
            </View>
          </View>

          {/* Section 4: Real-time Live Formula Preview Table (Matching Exact Chart) */}
          <View style={[styles.card, { backgroundColor: '#F9FAF9', borderColor: '#C8E6C9' }]}>
            <View style={styles.cardHeaderRow}>
              <Icon name="sparkles" size={18} color="#2F9A3C" />
              <Text style={[styles.cardTitle, { color: '#2E7D32' }]}>Formula Breakdown Preview ({testDistanceKm} KM)</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color: '#262A27', fontWeight: '600', marginRight: 8 }}>
                Test Passenger Distance:
              </Text>
              <TextInput
                style={[styles.textInput, { width: 80, height: 36, paddingLeft: 10, paddingVertical: 4 }]}
                keyboardType="numeric"
                value={testDistanceKm}
                onChangeText={setTestDistanceKm}
              />
              <Text style={{ fontSize: 12, color: '#8A908B', marginLeft: 6 }}>KM</Text>
            </View>

            {/* Official 4-Row Chart Preview */}
            <View style={styles.previewTable}>
              {/* Row 1 */}
              <View style={styles.previewBlock}>
                <Text style={styles.chartHeading}>Cars Below 1000 CC without AC Via GT Road</Text>
                <View style={styles.chartStatsRow}>
                  <Text style={styles.statPill}>Fuel: {preview1.averageFuelConsumptionLiters}L (Rs. {preview1.totalFuelCost})</Text>
                  <Text style={styles.statPill}>Toll: Rs. {preview1.tollCharges}</Text>
                  <Text style={styles.statPill}>Total: Rs. {preview1.totalTravelingCost}</Text>
                </View>
                <View style={styles.fareResultRow}>
                  <Text style={styles.perHeadLabel}>Per Head Fix Fare:</Text>
                  <Text style={styles.perHeadValue}>Rs. {preview1.perHeadFixedFare}</Text>
                </View>
              </View>

              {/* Row 2 */}
              <View style={styles.previewBlock}>
                <Text style={styles.chartHeading}>Cars Below 1000 CC without AC Via CPEC</Text>
                <View style={styles.chartStatsRow}>
                  <Text style={styles.statPill}>Fuel: {preview2.averageFuelConsumptionLiters}L (Rs. {preview2.totalFuelCost})</Text>
                  <Text style={styles.statPill}>Toll: Rs. {preview2.tollCharges}</Text>
                  <Text style={styles.statPill}>Total: Rs. {preview2.totalTravelingCost}</Text>
                </View>
                <View style={styles.fareResultRow}>
                  <Text style={styles.perHeadLabel}>Per Head Fix Fare:</Text>
                  <Text style={styles.perHeadValue}>Rs. {preview2.perHeadFixedFare}</Text>
                </View>
              </View>

              {/* Row 3 */}
              <View style={styles.previewBlock}>
                <Text style={styles.chartHeading}>Cars 1000 CC & Above with AC Via GT Road</Text>
                <View style={styles.chartStatsRow}>
                  <Text style={styles.statPill}>Fuel: {preview3.averageFuelConsumptionLiters}L (Rs. {preview3.totalFuelCost})</Text>
                  <Text style={styles.statPill}>Toll: Rs. {preview3.tollCharges}</Text>
                  <Text style={styles.statPill}>Total: Rs. {preview3.totalTravelingCost}</Text>
                </View>
                <View style={styles.fareResultRow}>
                  <Text style={styles.perHeadLabel}>Per Head Fix Fare:</Text>
                  <Text style={styles.perHeadValue}>Rs. {preview3.perHeadFixedFare}</Text>
                </View>
              </View>

              {/* Row 4 */}
              <View style={[styles.previewBlock, { borderBottomWidth: 0 }]}>
                <Text style={styles.chartHeading}>Cars 1000 CC & Above with AC Via CPEC</Text>
                <View style={styles.chartStatsRow}>
                  <Text style={styles.statPill}>Fuel: {preview4.averageFuelConsumptionLiters}L (Rs. {preview4.totalFuelCost})</Text>
                  <Text style={styles.statPill}>Toll: Rs. {preview4.tollCharges}</Text>
                  <Text style={styles.statPill}>Total: Rs. {preview4.totalTravelingCost}</Text>
                </View>
                <View style={styles.fareResultRow}>
                  <Text style={styles.perHeadLabel}>Per Head Fix Fare:</Text>
                  <Text style={styles.perHeadValue}>Rs. {preview4.perHeadFixedFare}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
            <Icon name="check" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.saveBtnText}>Save Formula & Update Rates</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F3F2',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E7E3',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#F2F3F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#262A27',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#8A908B',
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E3E7E3',
    ...Platform.select({
      ios: {
        shadowColor: '#262A27',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#262A27',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F3F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E7E3',
    paddingHorizontal: 12,
  },
  inputPrefix: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2F9A3C',
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    height: 46,
    fontSize: 14,
    fontWeight: '600',
    color: '#262A27',
    backgroundColor: '#F2F3F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E3E7E3',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  previewTable: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8F5E9',
    overflow: 'hidden',
  },
  previewBlock: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F3F2',
  },
  chartHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#262A27',
    marginBottom: 6,
  },
  chartStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  statPill: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4B5563',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fareResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(47, 154, 60, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  perHeadLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  perHeadValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2E7D32',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: '#E3E7E3',
  },
  saveBtn: {
    height: 50,
    backgroundColor: '#2F9A3C',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AdminFareFormulaModal;
