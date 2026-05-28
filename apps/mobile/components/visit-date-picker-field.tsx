import React, { useEffect, useState } from 'react';
import { View, Pressable, Platform } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { CheckIcon } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useUniwind } from 'uniwind';
import { isIosNativeDateTimePickerAvailable } from '@/lib/native-date-time-picker';
import {
  RN_API_MUTED_FOREGROUND_DARK,
  RN_API_MUTED_FOREGROUND_LIGHT,
} from '@/constants/rn-api-colors';

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  maximumDate?: Date;
};

function formatVisitDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function VisitDatePickerField({ value, onChange, maximumDate = new Date() }: Props) {
  const { theme } = useUniwind();
  const mutedIcon = theme === 'dark' ? RN_API_MUTED_FOREGROUND_DARK : RN_API_MUTED_FOREGROUND_LIGHT;
  const [showPicker, setShowPicker] = useState(false);
  const iosPickerAvailable = isIosNativeDateTimePickerAvailable();

  useEffect(() => {
    if (Platform.OS !== 'android' || !showPicker) return;

    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      maximumDate,
      onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
        setShowPicker(false);
        if (event.type === 'set' && selectedDate) {
          onChange(selectedDate);
        }
      },
    });

    return () => {
      void DateTimePickerAndroid.dismiss('date');
    };
    // Open once per tap; Android dialog ignores prop updates while visible.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPicker]);

  const handleIosDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  const openPicker = () => {
    if (Platform.OS === 'ios' && !iosPickerAvailable) {
      return;
    }
    setShowPicker(true);
  };

  return (
    <View>
      <View className="flex-row items-center rounded-xl border border-border bg-card px-4 py-3.5">
        <Pressable className="min-w-0 flex-1 active:opacity-90" onPress={openPicker}>
          <Text className="text-base font-medium text-foreground">{formatVisitDate(value)}</Text>
        </Pressable>
        {showPicker && Platform.OS === 'ios' ? (
          <Pressable
            accessibilityLabel="Confirm date"
            hitSlop={10}
            className="ml-2 items-center justify-center p-1 active:opacity-70"
            onPress={() => setShowPicker(false)}>
            <CheckIcon size={14} color={mutedIcon} strokeWidth={2.5} />
          </Pressable>
        ) : null}
      </View>

      {showPicker && Platform.OS === 'ios' && iosPickerAvailable ? (
        <View className="mt-3">
          <DateTimePicker
            value={value}
            mode="date"
            display="spinner"
            onChange={handleIosDateChange}
            maximumDate={maximumDate}
          />
        </View>
      ) : null}

      {Platform.OS === 'ios' && !iosPickerAvailable ? (
        <Text className="mt-2 text-sm text-muted-foreground">
          Date picker requires a development build. Run `pnpm ios` to rebuild the app.
        </Text>
      ) : null}
    </View>
  );
}
