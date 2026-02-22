import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

const COLORS = {
  red: '#FF5252',
  orange: '#FFB74D',
  green: '#4CAF50',
  textDark: '#000000',
  textLight: '#757575',
  white: '#FFFFFF',
  shadow: '#000000',
};

type Props = {
  valveOpen: boolean;
  onToggle: () => void;
};

const GasValveButton: React.FC<Props> = ({ valveOpen, onToggle }) => {
  const handleToggleWithConfirmation = () => {
    const title = valveOpen ? 'Close Valve?' : 'Open Valve?';
    const message = valveOpen
      ? 'Are you sure you want to close the gas valve?'
      : 'Are you sure you want to open the gas valve for cooking?';

    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: onToggle, style: 'default' },
    ]);
  };

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name={valveOpen ? 'lock-open-variant-outline' : 'lock-outline'}
        size={30}
        color={valveOpen ? COLORS.orange : COLORS.green}
        style={styles.icon}
      />

      <View style={styles.textContainer}>
        <Text style={styles.title}>Gas Valve</Text>
        <Text style={styles.subtitle}>{valveOpen ? 'OPEN' : 'CLOSED'}</Text>
      </View>

      <Switch
        trackColor={{ false: COLORS.green, true: COLORS.red }}
        thumbColor={COLORS.white}
        ios_backgroundColor={COLORS.green}
        onValueChange={handleToggleWithConfirmation}
        value={valveOpen}
        style={styles.switch}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginVertical: 10,
    // Drop shadow styling
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  icon: { marginRight: 20 },
  textContainer: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  subtitle: { fontSize: 13, fontWeight: '600', color: COLORS.textLight, marginTop: 4, textTransform: 'uppercase' },
  switch: { transform: [{ scaleX: 1.1 }, { scaleY: 1.1 }] },
});

export default GasValveButton;
