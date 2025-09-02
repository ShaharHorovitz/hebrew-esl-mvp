import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    // Log to console for developer visibility
    // eslint-disable-next-line no-console
    console.error('App crashed', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>אירעה שגיאה</Text>
          <Text style={styles.subtitle}>אנא רענן את העמוד או הפעל שוב את האפליקציה.</Text>
          {!!this.state.message && <Text style={styles.detail}>{this.state.message}</Text>}
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'right', marginBottom: 8 },
  subtitle: { fontSize: 16, textAlign: 'right', marginBottom: 12 },
  detail: { fontSize: 12, textAlign: 'right', color: '#6b7280' },
});

export default ErrorBoundary;


