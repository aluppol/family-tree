import type { ReactElement } from 'react';
import type { Person } from '../../api/types';
import { Avatar, Button, Card, FileButton, Icon, InlineError } from '../../design/components';
import { useT } from '../../i18n/languageContext';
import { fullName } from '../people/personName';
import styles from './Photo.module.scss';
import type { PhotoPreparation } from './usePhotoPreparation';

const ACCEPTED_PHOTO_TYPES = 'image/jpeg,image/png,image/webp';

export interface PhotoViewProps {
  person: Person;
  preparation: PhotoPreparation;
  isSaving: boolean;
  saveError: unknown;
  onFileSelect: (file: File) => void;
  onSave: () => void;
  onDiscard: () => void;
  onRemove: () => void;
}

export function PhotoView(props: PhotoViewProps): ReactElement {
  const { person, preparation } = props;
  const t = useT();
  return (
    <Card className={styles.photoCard}>
      {preparation.status === 'prepared' ? (
        <img className={styles.preview} src={preparation.preparedPhoto.previewUrl} alt={t('photos.previewAlt', { name: fullName(t, person) })} />
      ) : (
        <Avatar person={person} size="huge" alt={person.has_photo ? fullName(t, person) : ''} />
      )}
      <p className={styles.status} role="status">
        {preparation.status === 'preparing' ? t('photos.preparing') : ''}
      </p>
      <InlineError error={preparation.status === 'failed' ? preparation.error : props.saveError} />
      {preparation.status === 'prepared' ? <PreviewActions {...props} /> : <PhotoActions {...props} />}
    </Card>
  );
}

function PreviewActions({ isSaving, onSave, onDiscard }: PhotoViewProps): ReactElement {
  const t = useT();
  return (
    <div className={styles.actions}>
      <Button variant="primary" onClick={onSave} aria-disabled={isSaving}>
        {isSaving ? t('common.saving') : t('photos.save')}
      </Button>
      <Button onClick={onDiscard}>{t('common.cancel')}</Button>
    </div>
  );
}

function PhotoActions({ person, preparation, onFileSelect, onRemove }: PhotoViewProps): ReactElement {
  const t = useT();
  return (
    <div className={styles.actions}>
      <FileButton
        label={person.has_photo ? t('photos.replace') : t('photos.upload')}
        accept={ACCEPTED_PHOTO_TYPES}
        onFileSelect={onFileSelect}
        disabled={preparation.status === 'preparing'}
        icon={<Icon name="photo" />}
        size="small"
      />
      {person.has_photo && (
        <Button variant="ghost" size="small" onClick={onRemove}>
          {t('photos.remove')}
        </Button>
      )}
    </div>
  );
}
