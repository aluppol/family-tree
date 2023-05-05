import axios from 'axios'; 

export class PersonService {
    baseUrl = 'http://localhost:3000';
    url = '/people';

    static async getPerson(id) {
        if (!id) return null;
        return axios.get(`${this.baseUrl}${this.url}/${id}`);
        
    }

    static async getPeople() {
        return axios.get(`${this.baseUrl}${this.url}`);
        
    }

    static async updatePerson(id, payload = {}) {
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

    static async createPerson(payload = {}) {
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

    static async deletePerson(id) {
        if (!id) throw new Error('You have to provide id in order to delete person.')
        return axios.delete(`${this.baseUrl}${this.url}/${id}`);
        
    }
}