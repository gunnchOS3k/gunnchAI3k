// 3kMLV Arcade - Home Screen
// Main dashboard with quick access to games and features

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GameEmulationEngine } from '../core/GameEmulationEngine';
import { EdgeIOIntegration } from '../core/EdgeIOIntegration';
import { PerformanceEngine } from '../core/PerformanceEngine';

const { width, height } = Dimensions.get('window');

export const HomeScreen: React.FC = () => {
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [cloudGames, setCloudGames] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    loadData();
    setupEventListeners();
  }, []);

  const loadData = async () => {
    try {
      // Load recent games
      const emulationEngine = GameEmulationEngine.getInstance();
      const edgeIO = EdgeIOIntegration.getInstance();
      const performanceEngine = PerformanceEngine.getInstance();

      // Get cloud games
      const games = await edgeIO.getCloudGames();
      setCloudGames(games);

      // Get performance metrics
      const metrics = await performanceEngine.getMetrics();
      setPerformanceMetrics(metrics);

      // Check connection status
      const session = edgeIO.getCurrentSession();
      setIsConnected(!!session);
    } catch (error) {
      console.error('Failed to load home data:', error);
    }
  };

  const setupEventListeners = () => {
    const edgeIO = EdgeIOIntegration.getInstance();
    const performanceEngine = PerformanceEngine.getInstance();

    edgeIO.on('connectionStatus', (status) => {
      setIsConnected(status.connected);
    });

    performanceEngine.on('metricsUpdated', (metrics) => {
      setPerformanceMetrics(metrics);
    });
  };

  const quickActions = [
    {
      title: 'Start Emulation',
      icon: '🎮',
      color: '#00ff88',
      action: () => {
        // Navigate to emulator
      }
    },
    {
      title: 'Cloud Gaming',
      icon: '☁️',
      color: '#0088ff',
      action: () => {
        // Navigate to cloud gaming
      }
    },
    {
      title: 'Game Library',
      icon: '📚',
      color: '#ff8800',
      action: () => {
        // Navigate to library
      }
    },
    {
      title: 'Performance',
      icon: '📊',
      color: '#ff0088',
      action: () => {
        // Navigate to performance
      }
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#000', '#1a1a1a']}
        style={styles.header}
      >
        <Text style={styles.title}>3kMLV Arcade</Text>
        <Text style={styles.subtitle}>Ultra-High Performance Gaming</Text>
        
        {performanceMetrics && (
          <View style={styles.metricsContainer}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{performanceMetrics.fps}</Text>
              <Text style={styles.metricLabel}>FPS</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{performanceMetrics.latency}ms</Text>
              <Text style={styles.metricLabel}>Latency</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{isConnected ? 'ON' : 'OFF'}</Text>
              <Text style={styles.metricLabel}>Cloud</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.quickAction, { borderColor: action.color }]}
              onPress={action.action}
            >
              <Text style={styles.quickActionIcon}>{action.icon}</Text>
              <Text style={styles.quickActionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Games</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recentGames.map((game, index) => (
            <TouchableOpacity key={index} style={styles.gameCard}>
              <Image source={{ uri: game.cover }} style={styles.gameCover} />
              <Text style={styles.gameTitle}>{game.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Cloud Games</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {cloudGames.map((game, index) => (
            <TouchableOpacity key={index} style={styles.gameCard}>
              <Image source={{ uri: game.cover }} style={styles.gameCover} />
              <Text style={styles.gameTitle}>{game.name}</Text>
              <Text style={styles.gameStatus}>
                {game.isStreaming ? 'Streaming' : 'Available'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  header: {
    padding: 20,
    paddingTop: 40,
    alignItems: 'center'
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ff88',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginTop: 5
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    width: '100%'
  },
  metric: {
    alignItems: 'center'
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00ff88'
  },
  metricLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2
  },
  content: {
    padding: 20
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
    marginTop: 20
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  quickAction: {
    width: (width - 60) / 2,
    height: 100,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15
  },
  quickActionIcon: {
    fontSize: 30,
    marginBottom: 5
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center'
  },
  gameCard: {
    width: 120,
    marginRight: 15,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center'
  },
  gameCover: {
    width: 100,
    height: 100,
    borderRadius: 5,
    backgroundColor: '#333'
  },
  gameTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 5
  },
  gameStatus: {
    fontSize: 10,
    color: '#00ff88',
    marginTop: 2
  }
});
