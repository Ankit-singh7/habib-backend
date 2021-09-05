const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let serviceSalesReportSchema = new Schema(
    {
               sales_report_id: {
                    type: String,
                    default: '',
                    index: true,
                    unique: true
                },
                date: {
                    type: String,
                    default: ''
                },
                service_name: {
                    type: String,
                    default: ''
                },
                service_id: {
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
                employee_id:{
                    type: String,
                    default: ''
                },
                employee_name:{
                    type: String,
                    default: ''
                },
                quantity: {
                    type: Number,
                    default: 0
                }
                              
    }
)

mongoose.model('serviceSalesReport', serviceSalesReportSchema);
