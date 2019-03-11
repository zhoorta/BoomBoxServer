var jwt = require('jsonwebtoken');
//var config = require('../config');
const uniqid = require('uniqid')
const sha256 = require('js-sha256')

module.exports = class AuthController {
	
	constructor(db) {
		this.db =  db
      //this.server_key = 'L4CL4YSSpfML8G8Vb2V1u73E8pQeWdkkANR5xmq77gUT6BaUaGhe'
		this.server_key = sha256(uniqid())
		db.defaults({ keys: this.generateKeys() }).write()
   	}


   	generateKeys()
   	{
   		return [
   			{ id: sha256(uniqid()), secret: sha256(uniqid()), name: 'jmhmmm' },
   			{ id: sha256(uniqid()), secret: sha256(uniqid()), name: 'jipf' },
   			{ id: sha256(uniqid()), secret: sha256(uniqid()), name: 'shmm' },
   		]
   	}

   	async authenticate(secret)
   	{
   		const key = this.db.get('keys').find({ secret: secret }).value()

   		if(key != null) {
   			var token = jwt.sign({ id: key.id }, this.server_key, {
		      expiresIn: 86400 // expires in 24 hours
		    });
   			return { uid: key.id, auth: true, token: token }
   		}
   		return { auth: false, token: null, message: 'Authentication failed.' }
   	}

   	decodeToken(token)
   	{
   		try {
            var decoded = jwt.verify(token, this.server_key)
            return { auth: true, uid: decoded.id, iat: decoded.iat, exp: decoded.exp}
         } 
         catch(err) {
            return { auth: false, err: err}
         }
   	}

		
} 