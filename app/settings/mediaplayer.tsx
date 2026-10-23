import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';
import { StatusBar, View } from '@/components/Themed';
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/NativeSettings';
import NativeFieldSelect from '@/components/native-field-select';
import { getOriginalPlatform, showAlert } from '@/utils/platform';
import { Players } from '@/utils/MediaPlayer';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { useTheme } from '@/context/ThemeContext';
import { systemDarkBackground } from '@/constants/theme';

interface PlayerConfig {
  name: string;
  scheme: string;
  encodeUrl: boolean;
}

const DEFAULT_MEDIA_PLAYER_KEY = StorageKeys.DEFAULT_MEDIA_PLAYER_KEY;

const getPlatformSpecificPlayers = (): PlayerConfig[] => {
  const player = (name: string, scheme: string, encodeUrl = false): PlayerConfig => ({ name, scheme, encodeUrl });

  switch (getOriginalPlatform()) {
    case 'android':
      return [
        player(Players.Default, 'STREAMURL'),
        player(Players.VLC, 'vlc://STREAMURL'),
        player(Players.External, 'STREAMURL'),
      ];
    case 'ios':
      return [
        player(Players.Default, 'STREAMURL'),
        player(Players.External, 'STREAMURL'),
        player(Players.VLC, 'vlc://STREAMURL'),
        player(Players.Infuse, 'infuse://x-callback-url/play?url=STREAMURL', true),
        player(Players.VidHub, 'open-vidhub://x-callback-url/open?url=STREAMURL', true),
        player(Players.Outplayer, 'outplayer://STREAMURL'),
      ];
    case 'macos':
      return [
        player(Players.Default, 'STREAMURL'),
        player(Players.External, 'STREAMURL'),
        player(Players.VLC, 'vlc://STREAMURL'),
        player(Players.Infuse, 'infuse://x-callback-url/play?url=STREAMURL', true),
        player(Players.VidHub, 'open-vidhub://x-callback-url/open?url=STREAMURL', true),
      ];
    case 'web':
    case 'windows':
      return [player(Players.Default, 'STREAMURL'), player(Players.External, 'STREAMURL')];
    default:
      return [];
  }
};

export default function MediaPlayerConfigScreen() {
  const { colors } = useTheme();
  const [players, setPlayers] = useState<PlayerConfig[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const options = getPlatformSpecificPlayers();
      const saved = storageService.getItem(DEFAULT_MEDIA_PLAYER_KEY);
      const savedName = saved ? JSON.parse(saved) as string : options[0]?.name ?? null;
      setPlayers(options);
      setSelectedPlayer(options.some((option) => option.name === savedName) ? savedName : options[0]?.name ?? null);
    } catch (error) {
      console.error('Error loading player config:', error);
      showAlert('Error', 'Failed to load player configuration');
      setPlayers(getPlatformSpecificPlayers());
    } finally {
      setLoading(false);
    }
  }, []);

  const savePlayerConfig = async () => {
    if (!selectedPlayer) {
      showAlert('Error', 'Please select a media player');
      return;
    }
    setSaving(true);
    try {
      storageService.setItem(DEFAULT_MEDIA_PLAYER_KEY, JSON.stringify(selectedPlayer));
      showAlert('Success', 'Player settings saved successfully');
    } catch (error) {
      console.error('Error saving player config:', error);
      showAlert('Error', 'Failed to save player configuration');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    showAlert('Reset to Default', 'Are you sure you want to reset to the default media player?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: () => {
          try {
            storageService.removeItem(DEFAULT_MEDIA_PLAYER_KEY);
            const options = getPlatformSpecificPlayers();
            setPlayers(options);
            setSelectedPlayer(options[0]?.name ?? null);
            showAlert('Success', 'Player settings reset to default');
          } catch (error) {
            console.error('Error resetting player config:', error);
            showAlert('Error', 'Failed to reset player configuration');
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: systemDarkBackground }}>
      <StatusBar />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <SettingsPage>
          <SettingsSection title="Default Player" footer="Choose which player to use when opening a stream. The selection is used for future playback.">
            <NativeFieldSelect
              selectedValue={selectedPlayer ?? players[0]?.name ?? ''}
              onValueChange={setSelectedPlayer}
              options={players.map((player) => ({ label: player.name, value: player.name }))}
              enabled={players.length > 0}
            />
          </SettingsSection>
          <SettingsSection title="Actions">
            <SettingsRow
              title={saving ? 'Saving…' : 'Save Player'}
              onPress={savePlayerConfig}
              disabled={saving || !selectedPlayer}
              leading={<Ionicons name="checkmark-circle-outline" size={20} color={colors.primary} />}
            />
            <SettingsRow
              title="Reset to Default"
              onPress={resetToDefault}
              destructive
              isLast
              leading={<Ionicons name="refresh-outline" size={20} color="#ff453a" />}
              trailing={<Ionicons name="chevron-forward" size={17} color={colors.textDim} />}
            />
          </SettingsSection>
        </SettingsPage>
      )}
    </View>
  );
}
