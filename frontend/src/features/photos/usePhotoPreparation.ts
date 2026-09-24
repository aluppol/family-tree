import { useState } from 'react';
import { type PreparedPhoto, preparePhoto } from './preparePhoto';

export type PhotoPreparation =
  | { status: 'idle' }
  | { status: 'preparing' }
  | { status: 'prepared'; preparedPhoto: PreparedPhoto }
  | { status: 'failed'; error: unknown };

export interface PhotoPreparationControls {
  preparation: PhotoPreparation;
  prepare: (file: File) => void;
  discard: () => void;
}

const IDLE: PhotoPreparation = { status: 'idle' };

export function usePhotoPreparation(): PhotoPreparationControls {
  const [preparation, setPreparation] = useState<PhotoPreparation>(IDLE);
  function prepare(file: File): void {
    setPreparation({ status: 'preparing' });
    preparePhoto(file).then(
      (preparedPhoto) => {
        setPreparation({ status: 'prepared', preparedPhoto });
      },
      (error: unknown) => {
        setPreparation({ status: 'failed', error });
      },
    );
  }
  function discard(): void {
    setPreparation(IDLE);
  }
  return { preparation, prepare, discard };
}
