import { useEffect, useState } from 'react';
import './PersonEdit.sass';
import FormField from '../../../components/FormField/FormField';

const PersonEdit = ({ person, errors, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    family_name: '',
    birthday: null,
    father_id: null,
    mother_id: null
  });

  useEffect(() => {
    if (person) {
      setFormData(person);
    }
  }, [person]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(formData);
    setFormData({
      name: '',
      family_name: '',
      birthday: null,
      father_id: null,
      mother_id: null
    });
  };

  return (
    <div className='person-edit'>
      <form className="person-form" onSubmit={handleSubmit}>
        <FormField
          label="Name"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          errors={errors && errors.name}
          required
        />

        <FormField
          label="Family Name"
          name="family_name"
          value={formData.family_name || ''}
          onChange={handleChange}
          errors={errors && errors.family_name}
          required
        />

        <FormField
          label="Birthday"
          name="birthday"
          type="date"
          value={formData.birthday ? new Date(formData.birthday).toISOString().slice(0, 10) : ''}
          onChange={handleChange}
          errors={errors && errors.birthday}
          required
        />

        <FormField
          label="Father"
          name="father_id"
          type="select"
          value={formData.father_id || ''}
          onChange={handleChange}
          errors={errors && errors.father_id}
          selectOptions={[
            { value: '', label: '' }
            // Render father options dynamically
          ]}
        />

        <FormField
          label="Mother"
          name="mother_id"
          type="select"
          value={formData.mother_id || ''}
          onChange={handleChange}
          errors={errors && errors.mother_id}
          selectOptions={[
            { value: '', label: '' }
            // Render mother options dynamically
          ]}
        />

        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default PersonEdit;
