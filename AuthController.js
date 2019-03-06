var jwt = require('jsonwebtoken');
//var config = require('../config');
const uniqid = require('uniqid')

module.exports = class AuthController {
	
	constructor(db) {
		this.db =  db
		this.server_key = 'L4CL4YSSpfML8G8Vb2V1u73E8pQeWdkkANR5xmq77gUT6BaUaGhe'
		db.defaults({ keys: this.generateKeys() }).write()
   	}


   	generateKeys()
   	{
   		return [
   			{ id: uniqid(), secret: '1KV94mJAU3X5cdX4bUMuaNR2gXV6kDH7SB', name: 'jmhmmm' },
   			{ id: uniqid(), secret: '16TmJDenuD1pw3LSMdkrxeBsXihYNcVEu4', name: 'jipf' },
   			{ id: uniqid(), secret: '1959SpEqWaxgqFnm9vCYdtuKWUbvVGPKdn', name: 'shmm' },
   		]
   	}

   	async authenticate(secret)
   	{
   		const key = this.db.get('keys').find({ secret: secret }).value()

   		if(key != null) {
   			var token = jwt.sign({ id: key.id }, this.server_key, {
		      expiresIn: 86400 // expires in 24 hours
		    });
   			return { auth: true, token: token }
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