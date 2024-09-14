const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let appointmentSchema = new Schema(
    {
               appointment_id: {
                    type: String,
                    default: '',
                    index: true,
                    unique: true
                },
                employee_id: {
                    type: String,
                    default: ''
                },
                employee_name: {
                    type: String,
                    default: ''
                },
                appointment_date: {
                    type: String,
                    default: ''
                },
                appointment_time:{
                    type: String,
                    default: ''
                },
                customer_name: {
                    type: String,
                    default: ''
                },
                purpose: {
                    type: String,
                    default: ''
                },
                branch_id:{
                    type: String,
                    default: ''
                },
                branch_name:{
                    type: String,
                    default: ''
                },
                payment_mode:{
                    type: String,
                    default: ''
                },
                booking_amount:{
                    type: Number,
                    default: null
                },
                status:{
                    type: String,
                    default:'pending'
                },
                phone_number: { 
                    type: String,
                    default: ''
                },
                createdOn: {
                    type: Date
                  }

                              
    }
)

mongoose.model('appointment', appointmentSchema);
