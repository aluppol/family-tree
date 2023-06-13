import { MouseEventHandler } from 'react';
import './Btn.sass';

const BtnComponent = ({ action, text }: { action: MouseEventHandler<HTMLButtonElement>, text: string }) => {
  return (
    <button className="btn-component" onClick={action}>
        {text}
    </button>
  );
};

export default BtnComponent;
