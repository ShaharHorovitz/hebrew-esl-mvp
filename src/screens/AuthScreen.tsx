import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

const AuthScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>ברוך הבא</Text>
      <Text style={styles.subtitle}>כניסה (דמה) כדי להתחיל ללמוד</Text>
      <Pressable accessibilityRole="button" style={styles.button} onPress={() => navigation.replace('Topics')}>
        <Text style={styles.buttonText}>התחל</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    alignItems: 'stretch',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'right', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#444', textAlign: 'right', marginBottom: 24 },
  button: {
    backgroundColor: '#0a84ff',
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center' },
});

export default AuthScreen;


