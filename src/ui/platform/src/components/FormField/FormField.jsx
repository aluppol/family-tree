import React, { useState } from 'react';
import './FormField.sass';

const FormField = ({ label, value, onChange, errors, name, type = 'text', selectOptions = [], placeholder = ' ', required = false }) => {
  const [isActive, setIsActive] = useState(false);
  const activeTypes = ['date'];

  const handleFocus = () => {
    setIsActive(true);
  };

  const handleBlur = () => {
    setIsActive(false);
  };

  const renderInput = () => {
    if (type === 'select') {
      return (
        <select
          className="form-field-select"
          name={name}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          required={required}
        >
          {selectOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={type}
        value={value}
        name={name}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder ?? ''}
        required={required}
      />
    );
  };

  return (
    <div className={`form-field ${isActive || value ? 'active' : ''} ${errors ? 'error' : ''}`}>
      <label className={`${isActive || value || activeTypes.includes(type) ? 'small' : ''}`}>{label}{required && <span className="asterisk">*</span>}</label>
      {renderInput()}
      {errors && (
        <ul className="errors">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FormField;
