import { useEffect, useState } from 'react';
import './Person.sass';
import { useParams, useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { personService } from './PersonService.ts';
import PersonOverview from './PersonOverview/PersonOverview';
import PersonEdit from './PersonEdit/PersonEdit';

const PersonPage = () => {
  const { id: personId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [person, setPerson]= useState([]);
  const [errors, setErrors]= useState([]);
  const showEditButton = location.pathname.endsWith('/overview');

  const fetchData = async (id) => {
    const person = await personService.getPerson(personId);
    setPerson(person);
  }

  useEffect(() => {
    if (personId === 'new') {
      navigate('edit');
    } else if (person?.id !== personId) {
      fetchData(personId);
    }
  }, [personId]);

  const handleEdit = () => {
    navigate(`edit`);
  };

  const handleSave = async (payload) => {
    const isCreation = !person?.id;
    try {
      const res = await (isCreation ? personService.createPerson(payload) : personService.updatePerson(person.id, payload));
      setPerson(res.data);
      navigate(`/person/${res.data?.id}/overview`, { replace: isCreation ? true : false });
    } catch (e) {
      setErrors(e);
    }
  };

  return (
    <div className="person-page">
      {showEditButton && <button onClick={handleEdit}>Edit</button>}
      <Routes>
        <Route path="overview" element={<PersonOverview person={person} />} />
        <Route
          path="edit"
          element={<PersonEdit person={person} onSave={handleSave} errors={errors} />}
        />
      </Routes>
      </div>
  );
};

export default PersonPage;
