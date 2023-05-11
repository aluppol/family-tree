import axios from 'axios'; 

class PersonService {
    baseUrl = 'http://0.0.0.0:3001';
    url = '/people';

    async getPerson(id) {
        if (!id) return null;
        return axios.get(`${this.baseUrl}${this.url}/${id}`);
        
    }

    async getPeople() {
        return axios.get(`${this.baseUrl}${this.url}`);
        
    }

    async updatePerson(id, payload = {}) {
        if (!id) throw new Error('You have to provide id in order to update person.');
        const {
           name,
           family_name,
           birthday,
           father_id,
           mother_id,
        } = payload;
        return axios.put(`${this.baseUrl}${this.url}/${id}`, {
            name,
            family_name,
            birthday,
            father_id,
            mother_id,
        });
        
    }

    async createPerson(payload = {}) {
        const {
           name,
           family_name,
           birthday,
           father_id,
           mother_id,
        } = payload;
        return axios.post(`${this.baseUrl}${this.url}`, {
            name,
            family_name,
            birthday,
            father_id,
            mother_id,
        });
        
    }

    async deletePerson(id) {
        if (!id) throw new Error('You have to provide id in order to delete person.')
        return axios.delete(`${this.baseUrl}${this.url}/${id}`);
        
    }
}

export const personService = new PersonService();