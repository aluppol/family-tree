import { type ReactElement, useState, useSyncExternalStore } from 'react';
import { photoUrl, subscribeToPhotoRevisions } from '../../api/photos';
import type { PersonSummary } from '../../api/types';
import { AVATAR_CENTRE, AVATAR_RADIUS, clipUrl } from './cardGeometry';
import { initialsOf } from '../../design/components';
import styles from './ChartView.module.scss';

export interface NodeAvatarProps {
  person: PersonSummary;
  clipId: string;
}

export function NodeAvatar({ person, clipId }: NodeAvatarProps): ReactElement {
  const photoSource = useSyncExternalStore(subscribeToPhotoRevisions, () => photoUrl(person.id));
  const [brokenSource, setBrokenSource] = useState<string | null>(null);
  const showsPhoto = person.has_photo && brokenSource !== photoSource;
  function handlePhotoError(): void {
    setBrokenSource(photoSource);
  }
  return (
    <g aria-hidden="true">
      <circle className={styles.avatar} cx={AVATAR_CENTRE.x} cy={AVATAR_CENTRE.y} r={AVATAR_RADIUS} />
      <text className={styles.initials} x={AVATAR_CENTRE.x} y={AVATAR_CENTRE.y} textAnchor="middle" dominantBaseline="central">
        {initialsOf(person)}
      </text>
      {showsPhoto && (
        <image
          href={photoSource}
          x={AVATAR_CENTRE.x - AVATAR_RADIUS}
          y={AVATAR_CENTRE.y - AVATAR_RADIUS}
          width={AVATAR_RADIUS * 2}
          height={AVATAR_RADIUS * 2}
          clipPath={clipUrl(clipId)}
          preserveAspectRatio="xMidYMid slice"
          onError={handlePhotoError}
        />
      )}
    </g>
  );
}
