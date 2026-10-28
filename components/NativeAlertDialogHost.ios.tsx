import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { Host, Text, Button } from '@expo/ui';
import { ConfirmationDialog, RNHostView } from '@expo/ui/swift-ui';
import {
  completeNativeAlertDialog,
  getActiveNativeAlertDialog,
  subscribeToNativeAlertDialogs,
} from '@/utils/platform';

export default function NativeAlertDialogHost() {
  const request = useSyncExternalStore(
    subscribeToNativeAlertDialogs,
    getActiveNativeAlertDialog,
    getActiveNativeAlertDialog,
  );
  const [isPresented, setIsPresented] = useState(false);
  const selectedButtonIndex = useRef<number | undefined>(undefined);

  useEffect(() => {
    selectedButtonIndex.current = undefined;
    setIsPresented(request !== null);
  }, [request?.id]);

  const completeRequest = (nextIsPresented: boolean) => {
    setIsPresented(nextIsPresented);
    if (!nextIsPresented && request) {
      completeNativeAlertDialog(request.id, selectedButtonIndex.current);
    }
  };

  return (
    <Host
      matchContents
      colorScheme="dark"
      style={{ position: 'absolute', width: 1, height: 1, left: 0, bottom: 0 }}
    >
      <ConfirmationDialog
        title={request?.title ?? ''}
        titleVisibility="visible"
        isPresented={isPresented}
        onIsPresentedChange={completeRequest}
      >
        <ConfirmationDialog.Trigger>
          <RNHostView matchContents>
            <View style={{ width: 1, height: 1 }} />
          </RNHostView>
        </ConfirmationDialog.Trigger>
        {request?.message ? (
          <ConfirmationDialog.Message>
            <Text>{request.message}</Text>
          </ConfirmationDialog.Message>
        ) : null}
        <ConfirmationDialog.Actions>
          {(request?.buttons ?? [{ text: 'OK' }]).map((button, index) => (
            <Button
              key={`${request?.id ?? 'empty'}-${index}`}
              variant="text"
              onPress={() => {
                selectedButtonIndex.current = index;
                setIsPresented(false);
              }}
            >
              <Text textStyle={button.style === 'destructive' ? { color: '#ff3b30' } : undefined}>
                {button.text ?? 'OK'}
              </Text>
            </Button>
          ))}
        </ConfirmationDialog.Actions>
      </ConfirmationDialog>
    </Host>
  );
}
