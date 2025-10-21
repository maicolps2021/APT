import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface QRDisplayProps {
  url: string;
}

export const QRDisplay: React.FC<QRDisplayProps> = ({ url }) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <QRCodeSVG
        value={url}
        size={220}
        bgColor="#ffffff"
        fgColor="#020617"
        level="L"
        includeMargin={true}
      />
    </div>
  );
};
