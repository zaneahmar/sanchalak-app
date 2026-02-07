import React, { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';

const PlatformPicker = ({
  items = [],
  selectedValue,
  onValueChange,
  placeholder = 'Select',
  disabled = false,
  wrapperStyle,
  pickerStyle,
  buttonTextStyle,
  modalTitle,
}) => {
  const [visible, setVisible] = useState(false);

  const safeItems = Array.isArray(items) ? items : [];
  const normalizedItems = safeItems
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      label: String(item.label ?? item.value ?? ''),
      value: item.value,
    }));

  const selectedLabel = useMemo(() => {
    const match = normalizedItems.find(
      (item) => String(item.value) === String(selectedValue)
    );
    return match ? match.label : '';
  }, [normalizedItems, selectedValue]);

  const displayLabel = selectedLabel || placeholder;

  if (Platform.OS === 'android') {
    return (
      <View style={[styles.androidWrapper, wrapperStyle]}>
        <Picker
          enabled={!disabled}
          selectedValue={selectedValue}
          onValueChange={onValueChange}
          style={[
            styles.androidPicker,
            pickerStyle,
            {
              color: '#111',
              backgroundColor: 'transparent',
            },
          ]}
          dropdownIconColor="#007AFF"
          dropdownIconRippleColor="rgba(0, 122, 255, 0.2)"
          mode="dropdown"
        >
          {placeholder ? <Picker.Item label={placeholder} value="" color="#666" /> : null}
          {normalizedItems.map((item) => (
            <Picker.Item key={String(item.value)} label={item.label} value={item.value} color="#111" />
          ))}
        </Picker>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.iosButton, wrapperStyle]}
        onPress={() => setVisible(true)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={[styles.iosButtonText, buttonTextStyle]} numberOfLines={1}>
          {displayLabel}
        </Text>
      </TouchableOpacity>

      <Modal
        transparent
        animationType="slide"
        visible={visible}
        presentationStyle="overFullScreen"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalTitle || ''}</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <Picker
              selectedValue={selectedValue}
              onValueChange={onValueChange}
              style={[styles.iosPicker, styles.iosPickerFull]}
              itemStyle={styles.iosPickerItem}
            >
              {placeholder ? <Picker.Item label={placeholder} value="" /> : null}
              {normalizedItems.map((item) => (
                <Picker.Item key={String(item.value)} label={item.label} value={item.value} />
              ))}
            </Picker>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  iosButton: {
    height: 50,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  iosButtonText: {
    fontSize: 16,
    color: '#111',
  },
  androidWrapper: {
    minHeight: 50,
    justifyContent: 'center',
    backgroundColor: '#fff',
    overflow: 'visible',
    paddingHorizontal: 4,
  },
  androidPicker: {
    color: '#111',
    backgroundColor: 'transparent',
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'stretch',
  },
  modalSheet: {
    backgroundColor: '#fff',
    width: '100%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    paddingBottom: 8,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  modalDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  iosPicker: {
    width: '100%',
    backgroundColor: '#fff',
    color: '#000',
  },
  iosPickerFull: {
    height: 216,
  },
  iosPickerItem: {
    fontSize: 18,
    color: '#000',
  },
});

export default PlatformPicker;
