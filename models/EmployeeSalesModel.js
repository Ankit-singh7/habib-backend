const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let EmployeeSalesSchema = new Schema(
    {

        bill_id:{
            type: String,
            default: '',
            index: true,
            unique: true
        },
        customer_name: {
            type:String,
            default:''
        },
        customer_phone: {
            type:Number,
            default:null
        },
        customer_alternative_phone:{
            type:Number,
            default:null
        },
        customer_address: {
            type: String,
            default:''
        },
        payment_mode: {
            type:String,
            default:''
        },
        employee_name:{
            type:String,
            default:''
        },
        employee_id:{
            type:String,
            default:'' 
        },
        branch_id:{
            type:String,
            default:''
        },
        branch_name: {
            type:String,
            default:''
        },
        total_price: {
            type: Number,
            default:null
        },
        products: [
            {
               product_name: {
                type:String,
                default:''
               },
               product_id: {
                type:String,
                default:''
               },
               quantity:{
                   type:Number,
                   default:null
               },
              total:{
                type:Number,
                default:null
              }
            }
        ],
        services: [
            {
                service_name: {
                 type:String,
                 default:''
                },
                service_id: {
                 type:String,
                 default:''
                },
                quantity:{
                    type:Number,
                    default:null
                },
                total:{
                    type:Number,
                    default:null
                }
             } 
        ],
        date:{
            type:String,
            default:''
        },
        createdOn :{
            type:Date,
            default:''
          }
    }
)

mongoose.model('employeeSales', EmployeeSalesSchema);
