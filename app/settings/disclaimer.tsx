import React from 'react';
import { SettingsPage, SettingsRow, SettingsSection } from '@/components/NativeSettings';

export default function DisclaimerScreen() {
  return (
    <SettingsPage hideScrollIndicator>
      <SettingsSection title="About Strmify">
        <SettingsRow
          title="Purpose"
          detail="Strmify is a dashboard for movie and TV show information. It does not host, store, or distribute content. Content access is provided through third-party add-ons and external sources selected by users."
          detailSameFont
          isLast
        />
      </SettingsSection>
      <SettingsSection title="Your responsibility">
        <SettingsRow
          title="Legal compliance"
          detail="You are responsible for ensuring that your use of third-party add-ons and external content sources complies with the laws and regulations in your jurisdiction, including copyright laws and licensing agreements."
          detailSameFont
          isLast
        />
      </SettingsSection>
      <SettingsSection title="Third-party content">
        <SettingsRow
          title="Not endorsed"
          detail="The developer does not endorse, encourage, or support accessing pirated or illegally distributed content, using torrents for copyrighted material, illegal streaming or downloading, or any activity that violates copyright laws."
          detailSameFont
          isLast
        />
      </SettingsSection>
      <SettingsSection title="Developer responsibility">
        <SettingsRow
          title="Third-party sources"
          detail="The developer is not responsible for user actions or content accessed through add-ons, does not provide, control, or moderate third-party sources, and has no control over add-on functionality. The developer will not be held liable for legal consequences resulting from user actions."
          detailSameFont
          isLast
        />
      </SettingsSection>
    </SettingsPage>
  );
}
