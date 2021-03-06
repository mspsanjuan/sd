function getEnv(key, _default, type = 's') {
    if (!!process.env[key] === false) {
        return _default;
    }
    const value = process.env[key];
    switch (type) {
        case 'b':
            return value.toLowerCase() === 'true';
        case 'n':
            return parseInt(value, 10);
        default:
            return value;
    }
}

// Configuracion servicio RENAPER
export const renaper = {
    Usuario: getEnv('RENAPER_USERNAME', ''),
    password: getEnv('RENAPER_PASSWORD', ''),
    url: getEnv('RENAPER_URL', ''),
    serv: getEnv('RENAPER_SRV', '')
};

// Configuración de Passport
export const auth = {
    useLdap: getEnv('LDAP', false),
    jwtKey: getEnv('APP_KEY', '5gCYFZPp3dfA2m5UNElVkgRLFcFnBfZp'),
    ldapOU: getEnv('LDAP_HOST', 'ou=People,o=integrabilidad,o=neuquen')
};

// True: Expone una ruta de la api que lista todos los permisos disponibles
export const enablePermisosDoc = false;

// Puerto de LDAP
export const ports = {
    ldapPort: getEnv('LDAP_PORT', ':389')
};

// Hosts
export const hosts = {
    main: getEnv('MAIN_HOST', 'http://localhost:3002'),
    ldap: getEnv('LDAP_HOST', 'ldap.neuquen.gov.ar'),
    elastic_main: getEnv('ELASTIC_HOST', 'http://10.68.2.30:9200'),
    mongoDB_main: {
        host: getEnv('MONGO_MAIN', 'mongodb://10.68.2.30:27018/andes'), // ?authSource=admin
        options: {
            reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
            reconnectInterval: 500,
        }
    },
    mongoDB_mpi: {
        host: getEnv('MONGO_MPI', 'mongodb://10.68.2.30:27018/mpi'), // ?authSource=admin
        options: {
            reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
            reconnectInterval: 500,
        }
    },
    mongoDB_snomed: {
        host: getEnv('MONGO_SNOMED', 'mongodb://10.68.2.30:27018/es-edition'), // ?authSource=admin
        options: {
            reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
            reconnectInterval: 500,
        }
    },

    mongoDB_puco: {
        host: getEnv('MONGO_PUCO', 'mongodb://10.68.2.30:27018/padrones'),
        options: {
            reconnectTries: Number.MAX_VALUE, // Never stop trying to reconnect
            reconnectInterval: 1500,
        }
    }
};
// Mongoose config
export let mongooseDebugMode = false;

// Swagger config
export let enableSwagger = false;

// Configuración de Google Geocoding
export const geoKey = getEnv('GOOGLE_MAP_KEY', 'GOOGLE_MAP_KEY');

// Configuración servicio SISA
export const sisa = {
    username: getEnv('SISA_USERNAME', ''),
    password: getEnv('SISA_PASSWORD', ''),
    host: getEnv('SISA_HOST', 'sisa.msal.gov.ar'),
    port: getEnv('SISA_PORT', 443, 'n'),
    url: getEnv('SISA_URL', 'https://sisa.msal.gov.ar/sisa/services/rest/cmdb/obtener?'),
    urlEstablecimiento: getEnv('SISA_URL_ESTABLECIMIENTO', 'https://sisa.msal.gov.ar/sisa/services/rest/establecimiento/'),
    urlPrestacionesPorEfector: getEnv('SISA_URL_PRESTACIONES', 'https://sisa.msal.gov.ar/sisa/services/rest/establecimiento/prestaciones/'),
};
// Configuración servicio ANSES
export const anses = {
    Usuario: getEnv('ANSES_USERNAME', ''),
    password: getEnv('ANSES_PASSWORD', ''),
    url: getEnv('ANSES_URL', ''),
    serv: getEnv('ANSES_SERV', ''),
    serv2: getEnv('ANSES_SERV2', '')
};
// Configuración servicio SINTYS
export const sintys = {
    username: getEnv('SINTYS_USERNAME', ''),
    password: getEnv('SINTYS_PASSWORD', ''),
    host: getEnv('SINTYS_HOST', ''),
    port: getEnv('SINTYS_PORT', 443, 'n'),
    path: getEnv('SINTYS_PATH', '')
};
// Configuración para PUCO
export const puco = {
    database: 'puco',
    auth: {
        user: '',
        password: ''
    }
};


export const snomed = {
    dbName: getEnv('SNOMED_DB', 'es-edition'),
    dbVersion: getEnv('SNOMED_VERSION', 'v20171200')
};

// Configuración de Google Geocoding
//export const geoKey = getEnv('GOOGLE_MAP_KEY', 'GOOGLE_MAP_KEY');
export const geocodingPaths = {
    autocompletePart1: 'https://maps.googleapis.com/maps/api/place/autocomplete/json?input=',
    autocompletePart2: '+street&types=address&components=country:ar&language=es&key=',
    addressesPart1: 'https://maps.googleapis.com/maps/api/geocode/json?address=',
    addressesPart2: ',+AR&key='
};

// Push Notifications
export const pushNotificationsSettings = {
    gcm: {
        id: getEnv('GCM_API_KEY', 'GCM_API_KEY'),
        phonegap: true
    },
    apn: {
        token: {
            key: getEnv('IOS_KEY_FILE', './certs/key.p8'), // optionally: fs.readFileSync('./certs/key.p8')
            keyId: getEnv('IOS_KEY_ID', ''),
            teamId: getEnv('IOS_TEAM_ID', ''),
        },
        production: getEnv('IOS_ENVIRONMENT', true, 'b')
    },
    domainIOS: getEnv('IOS_MOBILE_DOMAIN', '')
};

// E-mail server settings
export const enviarMail = {
    host: getEnv('EMAIL_HOST', ''),
    port: getEnv('EMAIL_PORT', 587, 'n'),
    secure: getEnv('EMAIL_SECURE', false, 'b'),
    auth: {
        user: getEnv('EMAIL_USERNAME', ''),
        pass: getEnv('EMAIL_PASSWORD', '')
    }
};

// URLs descarga facmacias de turnos
export const farmaciasEndpoints = {
    localidades: 'http://181.231.9.13/cf/consultarturnos.aspx',
    turnos: 'http://181.231.9.13/lawen/turnos.aspx'
};

// Auth servicio geonode para capa de barrios
export const geoNode = {
    auth: {
        user: '',
        password: ''
    }
};

// Endpoints envio de SMS
export const SMSendpoints = {
    urlOperador: '',
    urlNumero: ''
};

export const jobs = [
    {
        when: '*/5 * * * * * ',
        action: './jobs/roboSenderJob'
    }
];

export const userScheduler = {
    user: {
        usuario: {
            nombre: 'Ejemplo',
            apellido: 'Scheduler'
        },
        organizacion: {
            nombre: 'Ejemplo'
        }
    },
    ip: '0.0.0.0',
    connection: {
        localAddress: '0.0.0.0'
    }
};

export const conSql = {
    auth: {
        user: '',
        password: ''
    },
    serverSql: {
        server: '',
        database: ''
    },
    pool: {
        acquireTimeoutMillis: 15000
    }
};

export const conSqlHPN = {
    auth: {
        user: '',
        password: ''
    },
    serverSql: {
        server: '',
        database: '',
        port: ''
    },
    pool: {
        acquireTimeoutMillis: 15000
    }

};

export const CDA = {
    rootOID: '',
    dniOID: '',
    idOID: '',
    matriculaOID: '',
};

export const wsSalud = {
    host: '',
    hostHPN: '',
    getPaciente: '',
    getResultado: '',
    hellerWS: '',
    hellerFS: '',
    hpnWS: '',
};

export const conSqlPecas = {
    auth: {
        user: '',
        password: ''
    },
    serverSql: {
        server: '',
        database: ''
    },
    table: {
        pecasTable: 'pecas_consolidadoPrueba',
        fueraAgenda: ''
    }
};

export const RedisWebSockets = {
    active: getEnv('REDIS', false),
    host: getEnv('REDIS_HOST', 'localhost', 'b'),
    port: getEnv('REDIS_PORT', '6379', 'n')
};

export const sqlCarpetasJob = {
    user: '',
    password: '',
    server: '',
    database: '',
    requestTimeout: '',
    stream: ''
};

export const TwitterConfig = {
    consumer_key: '',
    consumer_secret: '',
    access_token_key: '',
    access_token_secret: ''
};

export const registroProvincialData = {
    hostost: '',
    queryFechaPath: ''
};
export const Drive = {
    adapter: 'file',
    options: {}
};

// Lista separada por comas de emails (string)
export const emailListString = '';

export const logDatabase = {
    log: {
        host: getEnv('MONGO_LOGS', `mongodb://10.68.2.30:27018/andesLogs`),
        options: {
            reconnectTries: Number.MAX_VALUE,
            reconnectInterval: 1500,
            useNewUrlParser: true
        }
    }
};

// un string con un valor de expiración
export const mobileExpiredVersion = '100';

export const FHIR = {
    domain: getEnv('FHIR_DOMAIN', `http://neuquen.gob.ar`),
    ips_host: getEnv('IPS_HOST', 'https://testapp.hospitalitaliano.org.ar'),
    secret: getEnv('IPS_SECRET', ``)
};
