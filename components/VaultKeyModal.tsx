import React from 'react';
interface Props { isOpen: boolean; onClose: () => void; currentKey: string | null; onSaveKey: (key: string) => void; }
const VaultKeyModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return <div>Vault Key Modal Placeholder <button onClick={onClose}>Close</button></div>;
};
export default VaultKeyModal;
