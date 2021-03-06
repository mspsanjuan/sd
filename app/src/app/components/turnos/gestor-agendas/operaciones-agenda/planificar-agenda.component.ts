import { ITipoPrestacion } from './../../../../interfaces/ITipoPrestacion';
import { OrganizacionService } from './../../../../services/organizacion.service';
import { Component, EventEmitter, Output, OnInit, Input, HostBinding, AfterViewInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Auth } from '@andes/auth';
import { Plex } from '@andes/plex';
import * as moment from 'moment';
import * as operaciones from './../../../../utils/operacionesJSON';
import { IAgenda } from './../../../../interfaces/turnos/IAgenda';
import { TipoPrestacionService } from './../../../../services/tipoPrestacion.service';
import { AgendaService } from './../../../../services/turnos/agenda.service';
import { EspacioFisicoService } from './../../../../services/turnos/espacio-fisico.service';
import { ProfesionalService } from './../../../../services/profesional.service';
import { ISubscription } from 'rxjs/Subscription';
import { TipoPrestacionComponent } from '../../../tipoPrestacion/tipoPrestacion.component';

@Component({
    selector: 'planificar-agenda',
    templateUrl: 'planificar-agenda.html',
    styleUrls: [
        'planificar-agenda.scss'
    ]
})
export class PlanificarAgendaComponent implements OnInit, AfterViewInit {
    hideGuardar: boolean;
    subscriptionID: any;
    @HostBinding('class.plex-layout') layout = true;  // Permite el uso de flex-box en el componente

    private _editarAgenda: any;
    @Input('editaAgenda')
    set editaAgenda(value: any) {
        this._editarAgenda = value;
    }
    get editaAgenda(): any {
        return this._editarAgenda;
    }

    @Output() volverAlGestor = new EventEmitter<boolean>();

    public modelo: any = { nominalizada: true, dinamica: false };
    public noNominalizada = false;
    public dinamica = false;
    public bloqueActivo: Number = 0;
    public elementoActivo: any = { descripcion: null };
    public alertas = [];
    public fecha: Date;
    public autorizado = false;
    public today = new Date();
    public mobileEnabled: null;
    showClonar = false;
    showAgenda = true;
    espacioFisicoPropios = true;
    textoEspacio = 'Espacios físicos de la organización';
    showBloque = true;
    cupoMaximo: Number;
    setCupo = false;
    // ultima request de profesionales que se almacena con el subscribe
    private lastRequest: ISubscription;

    constructor(public plex: Plex, public servicioProfesional: ProfesionalService, public servicioEspacioFisico: EspacioFisicoService, public organizacionService: OrganizacionService,
        public serviceAgenda: AgendaService, public servicioTipoPrestacion: TipoPrestacionService, public auth: Auth) { }

    ngOnInit() {
        this.autorizado = this.auth.getPermissions('turnos:planificarAgenda:?').length > 0;
        this.today.setHours(0, 0, 0, 0);
        // recuperamos datos de la organizacion
        this.loadOrganizationData();
        if (this.editaAgenda) {
            this.cargarAgenda(this._editarAgenda);
            this.bloqueActivo = 0;
            if (this._editarAgenda.dinamica) { // hay que chequear si existe la prop dinamica porque es nueva en el esquema.
                this.dinamica = true;
            }
        } else {
            this.modelo.bloques = [];
            this.bloqueActivo = -1;
        }
    }

    ngAfterViewInit() {
        this.plex.wizard({
            id: 'citas:planificarAgenda',
            updatedOn: moment('2018-08-15').toDate(),
            steps: [
                { title: 'Novedades del módulo CITAS', content: '15/08/2018', imageClass: 'plex-wizard-citas-planificarAgendas' },
                { title: 'Planificación de Agendas Dinámicas', content: 'Esta opción permite crear agendas sin horarios predefinidos, para ser utilizadas en consultorios de demanda espontánea (ej: Guardia, Enfermería, Recetas, etc.)', imageClass: 'plex-wizard-citas-planificarAgendas-dinamica' },
                { title: 'Cupo máximo', content: 'El campo cupo máximo permite, opcionalmente, establecer una cantidad maxima de pacientes.', imageClass: 'plex-wizard-planificarAgendas-dinamicaCupo' },
                { title: 'Turnos para Agendas Dinámicas', content: 'Los pacientes se van agregando en el orden en que son asignados a la agenda.', imageClass: 'plex-wizard-citas-planificarAgendas-darTurnos' },
            ],
            forceShow: false,
            fullScreen: true,
            showNumbers: false
        });
    }

    cargarAgenda(agenda: IAgenda) {
        this.modelo = agenda;
        // se carga el tipo de espacio Fisico
        if (this.modelo.espacioFisico && !this.modelo.espacioFisico.organizacion) {
            this.espacioFisicoPropios = false;
        }
        this.noNominalizada = !this.modelo.nominalizada;
        if (!this.modelo.intercalar) {
            this.modelo.bloques.sort(this.compararBloques);
        }
        this.calculosInicio();
    }

    loadTipoPrestaciones(event) {
        this.servicioTipoPrestacion.get({ turneable: 1 }).subscribe((data) => {
            let dataF = data.filter(x => {
                return this.auth.check('turnos:planificarAgenda:prestacion:' + x.id);
            });
            event.callback(dataF);
        });
    }

    loadProfesionales(event) {
        if (this.modelo && this.modelo.profesionales && this.modelo.profesionales.length > 0) {
            event.callback(this.modelo.profesionales);
        }
        if (event.query && event.query !== '' && event.query.length > 2) {
            // cancelamos ultimo request
            if (this.lastRequest) {
                this.lastRequest.unsubscribe();
            }
            let query = {
                nombreCompleto: event.query
            };

            this.lastRequest = this.servicioProfesional.get(query).subscribe(resultado => {
                event.callback(resultado);
            });
        } else {
            // cancelamos ultimo request
            if (this.lastRequest) {
                this.lastRequest.unsubscribe();
            }
            event.callback([]);
        }

    }

    loadOrganizationData() {
        this.organizacionService.getById(this.auth.organizacion._id).subscribe(org => {
            let organization: any = org;
            if (organization && organization.turnosMobile) {
                this.mobileEnabled = organization.turnosMobile;
            }
        });
    }

    loadSectores(event) {
        this.servicioEspacioFisico.get({ organizacion: this.auth.organizacion._id }).subscribe(respuesta => {
            let sectores = respuesta.map((ef) => {
                return (typeof ef.sector !== 'undefined' && ef.sector.nombre !== '-' ? { nombre: ef.sector.nombre, id: ef.sector.id } : []);
            });
            event.callback(sectores);
        });
    }

    /**
     * filtro espacios fisicos
     * @memberof PlanificarAgendaComponent
     */
    filtrarEspacioFisico() {
        this.modelo.espacioFisico = null;
        if (!this.espacioFisicoPropios) {
            this.textoEspacio = 'Otros Espacios Físicos';
            this.showBloque = true;
        } else {
            this.textoEspacio = 'Espacios físicos de la organización';
        }
    }

    loadEspaciosFisicos(event) {
        if (event.query) {
            let query = {
                activo: true,
                nombre: event.query
            };
            if (!this.espacioFisicoPropios) {
                query['sinOrganizacion'] = true;
            } else {
                query['organizacion'] = this.auth.organizacion.id;
            }
            this.servicioEspacioFisico.get(query).subscribe(resultado => {
                let listaEspaciosFisicos = [];

                if (this.modelo.espacioFisico && this.modelo.espacioFisico.id) {
                    listaEspaciosFisicos = this.modelo.espacioFisico ? this.modelo.espacioFisico.concat(resultado) : resultado;
                } else {
                    listaEspaciosFisicos = resultado;
                }
                event.callback(listaEspaciosFisicos);
            });
        } else {
            event.callback(this.modelo.espacioFisico ? [this.modelo.espacioFisico] : event.callback([]));
        }
    }

    horaInicioPlus() {
        return moment(this.modelo.horaInicio).add(30, 'minutes');
    }
    fechaInicio() {
        return moment(new Date()).startOf('day');
    }

    inicializarPrestacionesBloques(bloque) {
        if (this.modelo.tipoPrestaciones) {
            this.modelo.tipoPrestaciones.forEach((prestacion, index) => {
                const copiaPrestacion = operaciones.clonarObjeto(prestacion);
                if (bloque.tipoPrestaciones) {
                    let i = bloque.tipoPrestaciones.map(function (e) { return e.nombre; }).
                        indexOf(copiaPrestacion.nombre);
                    if (i >= 0) {
                        bloque.tipoPrestaciones[i].activo = true;
                    } else {
                        bloque.tipoPrestaciones.push(copiaPrestacion);
                        bloque.tipoPrestaciones[bloque.tipoPrestaciones.length - 1].activo = false;
                    }
                } else {
                    bloque.tipoPrestaciones.push(copiaPrestacion);
                    bloque.tipoPrestaciones[bloque.tipoPrestaciones.length - 1].activo = false;
                }
            });
            if (this.modelo.tipoPrestaciones.length === 1) {
                bloque.tipoPrestaciones[0].activo = true;
            }
        }
    }

    seleccionarDinamica() {
        if (this.dinamica) {
            if (this.noNominalizada) {
                this.plex.info('warning', 'No se puede configurar como dinámica ya que la prestación seleccionada es no nominalizada').then(() => {
                    this.dinamica = false;
                });
            } else {
                this.noNominalizada = false;
                this.modelo.nominalizada = true;
            }
            // Se activan las prestaciones para la agenda
            this.modelo.bloques[0].tipoPrestaciones.forEach(unaPrestacion => {
                unaPrestacion.activo = true;
            });
        }
    }

    calculosInicio() {
        this.modelo.fecha = this.modelo.horaInicio;
        let bloques = this.modelo.bloques;
        bloques.forEach((bloque, index) => {
            bloque.indice = index;
            if (!this.modelo.intercalar) {
                bloque.horaInicio = new Date(bloque.horaInicio);
                bloque.horaFin = new Date(bloque.horaFin);
            }
            if (bloque.cantidadTurnos) {
                bloque.accesoDirectoDelDia ? bloque.accesoDirectoDelDiaPorc = Math.floor
                    ((bloque.accesoDirectoDelDia * 100) / bloque.cantidadTurnos) : bloque.accesoDirectoDelDiaPorc = 0;
                bloque.accesoDirectoProgramado ? bloque.accesoDirectoProgramadoPorc = Math.floor
                    ((bloque.accesoDirectoProgramado * 100) / bloque.cantidadTurnos) : bloque.accesoDirectoProgramadoPorc = 0;
                bloque.reservadoGestion ? bloque.reservadoGestionPorc = Math.floor
                    ((bloque.reservadoGestion * 100) / bloque.cantidadTurnos) : bloque.reservadoGestionPorc = 0;
                bloque.reservadoProfesional ? bloque.reservadoProfesionalPorc = Math.floor
                    ((bloque.reservadoProfesional * 100) / bloque.cantidadTurnos) : bloque.reservadoProfesionalPorc = 0;
                if (!this.modelo.intercalar) {
                    const duracion = this.calcularDuracion(bloque.horaInicio, bloque.horaFin, bloque.cantidadTurnos);
                    bloque.duracionTurno = Math.floor(duracion);
                }
            } else {
                bloque.accesoDirectoDelDiaPorc = 0;
                bloque.accesoDirectoProgramadoPorc = 0;
                bloque.reservadoGestionPorc = 0;
                bloque.reservadoProfesionalPorc = 0;
            }
            this.inicializarPrestacionesBloques(bloque);
        });
        this.validarTodo();
        this.activarBloque(0);
    }

    activarBloque(indice: number) {
        this.bloqueActivo = indice;
        this.elementoActivo = this.modelo.bloques[indice];
    }

    addBloque() {
        const longitud = this.modelo.bloques.length;

        if (longitud === 0 || (this.modelo.bloques[longitud - 1].horaInicio && this.modelo.bloques[longitud - 1].horaFin)) {
            this.modelo.bloques.push({
                indice: longitud,
                // 'descripcion': `Bloque {longitud + 1}°`,
                'cantidadTurnos': 0,
                'horaInicio': null,
                'horaFin': null,
                'duracionTurno': 0,
                'cantidadSimultaneos': null,
                'cantidadBloque': null,
                'accesoDirectoDelDia': 0, 'accesoDirectoDelDiaPorc': 0,
                'accesoDirectoProgramado': 0, 'accesoDirectoProgramadoPorc': 0,
                'reservadoGestion': 0, 'reservadoGestionPorc': 0,
                'reservadoProfesional': 0, 'reservadoProfesionalPorc': 0,
                'tipoPrestaciones': []
            });
            this.activarBloque(longitud);
            this.inicializarPrestacionesBloques(this.elementoActivo);
        }
    }

    deleteBloque(indice: number) {
        this.plex.confirm('¿Confirma que desea eliminar el bloque?').then((confirma) => {
            if (confirma) {
                this.modelo.bloques.splice(indice, 1);
                this.bloqueActivo = -1;
                this.validarTodo();

                for (let i = 0; i < this.modelo.bloques.length; i++) {
                    this.modelo.bloques[i].indice = i;
                }
            }
        }
        ).catch(() => {
        });
    }

    compararBloques(fecha1, fecha2): number {
        // let indiceAux: Number;
        if (fecha1.horaInicio && fecha2.horaInicio) {
            // /* if (fecha1.horaInicio.getTime() - fecha2.horaInicio.getTime() > 0) {
            //     indiceAux = fecha1.indice;
            //     fecha1.indice = fecha2.indice;
            //     fecha2.indice = indiceAux;
            // } */
            return fecha1.horaInicio.getTime() - fecha2.horaInicio.getTime();
        } else {
            return 0;
        }
    }

    compararFechas(fecha1: Date, fecha2: Date): number {
        if (fecha1 && fecha2) {
            return fecha1.getTime() - fecha2.getTime();
        } else {
            return 0;
        }
    }

    cambioPrestaciones() {
        // Valores por defecto
        this.noNominalizada = false;
        this.dinamica = false;
        this.modelo.nominalizada = true;

        if (this.modelo.tipoPrestaciones && this.modelo.tipoPrestaciones.length === 1) {
            if (this.modelo.tipoPrestaciones[0].noNominalizada) {
                this.noNominalizada = true;
                this.dinamica = false;
                this.modelo.nominalizada = false;
            }
        }
        if (this.modelo.bloques.length === 0) {
            this.addBloque();
            this.bloqueActivo = 0;
            this.elementoActivo.horaInicio = this.modelo.horaInicio;
            this.elementoActivo.horaFin = this.modelo.horaFin;
        } else {
            this.modelo.bloques.forEach((bloque) => {
                // Si se elimino una prestación, la saco de los bloques
                if (bloque.tipoPrestaciones) {
                    bloque.tipoPrestaciones.forEach((bloquePrestacion, index) => {
                        if (this.modelo.tipoPrestaciones) {
                            const tipo = this.modelo.tipoPrestaciones.find(x => x.nombre === bloquePrestacion.nombre);
                            const i = this.modelo.tipoPrestaciones.indexOf(tipo);
                            if (i < 0) {
                                bloque.tipoPrestaciones.splice(index, 1);
                                if (bloque.tipoPrestaciones.length === 1) {
                                    bloque.tipoPrestaciones[0].activo = true;
                                }
                            }
                        } else {
                            bloque.tipoPrestaciones = [];
                        }
                    });
                }
                // Si se agrego una prestacion, la agrego a los bloques
                if (this.modelo.tipoPrestaciones) {
                    this.modelo.tipoPrestaciones.forEach((prestacion) => {
                        let copiaPrestacion = operaciones.clonarObjeto(prestacion);
                        copiaPrestacion.activo = false;
                        const tipo = bloque.tipoPrestaciones.find(x => x.nombre === copiaPrestacion.nombre);
                        const i = bloque.tipoPrestaciones.indexOf(tipo);
                        if (i < 0) {
                            bloque.tipoPrestaciones.push(copiaPrestacion);
                        }
                    });
                }
                if (bloque.tipoPrestaciones.length === 1) {
                    bloque.tipoPrestaciones[0].activo = true;
                }
            });
        }
    }

    cambioHoraBloques(texto: String) {
        if (this.elementoActivo.horaInicio && this.elementoActivo.horaFin) {
            this.fecha = new Date(this.modelo.fecha);
            if (this.elementoActivo.horaInicio) {
                this.aproximar(this.elementoActivo.horaInicio);
            }
            if (this.elementoActivo.horaFin) {
                this.aproximar(this.elementoActivo.horaFin);
            }
            let inicio = this.combinarFechas(this.fecha, this.elementoActivo.horaInicio);
            let fin = this.combinarFechas(this.fecha, this.elementoActivo.horaFin);

            if (inicio && fin) {
                let duracion = this.calcularDuracion(inicio, fin, this.elementoActivo.cantidadTurnos);
                if (duracion) {
                    this.elementoActivo.duracionTurno = Math.floor(duracion);
                    let cantidad = this.calcularCantidad(inicio, fin, duracion);
                    this.elementoActivo.cantidadTurnos = Math.floor(cantidad);
                }
                this.validarTodo();
            }
            if (texto === 'fin' && !this.modelo.intercalar) {
                this.modelo.bloques.sort(this.compararBloques);
            }
            this.modelo.bloques.forEach((bloque, index) => {
                bloque.indice = index;
            });
        }

    }

    cambiaTurnos(cual: String) {
        this.fecha = new Date(this.modelo.fecha);
        let inicio = this.combinarFechas(this.fecha, this.elementoActivo.horaInicio);
        let fin = this.combinarFechas(this.fecha, this.elementoActivo.horaFin);
        if (inicio && fin) {
            if (cual === 'cantidad' && this.elementoActivo.cantidadTurnos) {
                this.elementoActivo.duracionTurno = this.calcularDuracion(inicio, fin, this.elementoActivo.cantidadTurnos);
            }
            if (cual === 'duracion' && this.elementoActivo.duracionTurno) {
                this.elementoActivo.cantidadTurnos = this.calcularCantidad(inicio, fin, this.elementoActivo.duracionTurno);
            }
            this.verificarCantidades();
        }
        this.validarTodo();
    }

    cambiaCantTipo(cual: String) {
        if (this.elementoActivo.cantidadTurnos) {
            switch (cual) {
                case 'accesoDirectoDelDia':
                    this.elementoActivo.accesoDirectoDelDiaPorc = Math.ceil
                        ((this.elementoActivo.accesoDirectoDelDia * 100) / this.elementoActivo.cantidadTurnos);
                    break;
                case 'accesoDirectoProgramado':
                    this.elementoActivo.accesoDirectoProgramadoPorc = Math.ceil
                        ((this.elementoActivo.accesoDirectoProgramado * 100) / this.elementoActivo.cantidadTurnos);
                    break;
                case 'reservadoGestion':
                    this.elementoActivo.reservadoGestionPorc = Math.ceil
                        ((this.elementoActivo.reservadoGestion * 100) / this.elementoActivo.cantidadTurnos);
                    break;
                case 'reservadoProfesional':
                    this.elementoActivo.reservadoProfesionalPorc = Math.ceil
                        ((this.elementoActivo.reservadoProfesional * 100) / this.elementoActivo.cantidadTurnos);
                    break;
            }
            this.validarTodo();
        }
    }

    cambiaPorcentajeTipo(cual: String) {
        if (this.elementoActivo.cantidadTurnos) {
            switch (cual) {
                case 'accesoDirectoDelDia':
                    this.elementoActivo.accesoDirectoDelDia = Math.floor
                        ((this.elementoActivo.accesoDirectoDelDiaPorc * this.elementoActivo.cantidadTurnos) / 100);
                    break;
                case 'accesoDirectoProgramado':
                    this.elementoActivo.accesoDirectoProgramado = Math.floor
                        ((this.elementoActivo.accesoDirectoProgramadoPorc * this.elementoActivo.cantidadTurnos) / 100);
                    break;
                case 'reservadoGestion':
                    this.elementoActivo.reservadoGestion = Math.floor
                        ((this.elementoActivo.reservadoGestionPorc * this.elementoActivo.cantidadTurnos) / 100);
                    break;
                case 'reservadoProfesional':
                    this.elementoActivo.reservadoProfesional = Math.floor
                        ((this.elementoActivo.reservadoProfesionalPorc * this.elementoActivo.cantidadTurnos) / 100);
                    break;
            }
        }
        this.validarTodo();
    }

    intercalar() {
        if (!this.modelo.intercalar) {
            this.modelo.bloques.forEach((bloque, index) => {
                bloque.horaInicio = null;
                bloque.horaFin = null;
            });
        }
    }

    xor(seleccion) {
        if (seleccion === 'simultaneos') {
            if (this.elementoActivo.citarPorBloque) {
                this.plex.info('warning', 'No puede haber pacientes simultáneos y citación por segmento al mismo tiempo');
                this.elementoActivo.pacienteSimultaneos = false;
            }
        }
    }

    calcularDuracion(inicio, fin, cantidad) {
        if (cantidad && inicio && fin) {
            inicio = moment(inicio);
            fin = moment(fin);
            let total = fin.diff(inicio, 'minutes');
            return Math.floor(total / cantidad);
        } else {
            if (this.elementoActivo.duracionTurno) {
                return this.elementoActivo.duracionTurno;
            } else {
                return null;
            }
        }
    }

    calcularCantidad(inicio, fin, duracion) {
        if (duracion && duracion && inicio && fin) {
            inicio = moment(inicio);
            fin = moment(fin);
            let total = fin.diff(inicio, 'minutes');
            return Math.floor(total / duracion);
        } else {
            if (this.elementoActivo.cantidadTurnos) {
                return this.elementoActivo.cantidadTurnos;
            } else {
                return null;
            }
        }
    }

    verificarCantidades() {
        this.cambiaPorcentajeTipo('accesoDirectoDelDia');
        this.cambiaPorcentajeTipo('accesoDirectoProgramado');
        this.cambiaPorcentajeTipo('reservadoGestion');
        this.cambiaPorcentajeTipo('reservadoProfesional');
    }

    aproximar(date: Date) {
        let m = date.getMinutes();
        let remaider = m % 5;
        if (remaider !== 0) {
            if (remaider < 3) {
                date.setMinutes(m - remaider);
            } else {
                date.setMinutes(m + (5 - remaider));
            }
        }
    }

    validarTodo() {
        this.alertas = [];
        let alerta: string;
        let indice: number;
        let cantidad: number;
        let iniAgenda = null;
        let finAgenda = null;
        this.fecha = new Date(this.modelo.fecha);

        if (this.modelo.horaInicio) {
            this.aproximar(this.modelo.horaInicio);
        }

        if (this.modelo.horaFin) {
            this.aproximar(this.modelo.horaFin);
        }

        if (this.modelo.horaInicio && this.modelo.horaFin) {
            iniAgenda = this.combinarFechas(this.fecha, this.modelo.horaInicio);
            finAgenda = this.combinarFechas(this.fecha, this.modelo.horaFin);
            if (this.dinamica) {
                this.modelo.bloques[0].horaInicio = iniAgenda;
                this.modelo.bloques[0].horaFin = finAgenda;
            }
        }
        let bloques = this.modelo.bloques;
        let totalBloques = 0;

        // Verifica que ningún profesional de la agenda esté asignado a otra agenda en ese horario
        if (iniAgenda && finAgenda && this.modelo.profesionales) {
            this.modelo.profesionales.forEach((profesional, index) => {
                this.serviceAgenda.get({ 'organizacion': this.auth.organizacion.id, idProfesional: profesional.id, rango: true, desde: iniAgenda, hasta: finAgenda, estados: ['planificacion', 'disponible', 'publicada', 'pausada'] }).
                    subscribe(agendas => {
                        let agds = agendas.filter(agenda => {
                            return agenda.id !== this.modelo.id || !this.modelo.id;
                        });
                        if (agds.length > 0) {
                            alerta = 'El profesional ' + profesional.nombre + ' ' + profesional.apellido + ' está asignado a otra agenda en ese horario';
                            if (this.alertas.indexOf(alerta) < 0) {
                                this.alertas = [... this.alertas, alerta];

                            }
                        }
                    });
            });
        }
        // Verifica que el espacio fisico no esté ocupado en ese rango horario
        if (iniAgenda && finAgenda && this.modelo.espacioFisico) {
            this.serviceAgenda.get({ espacioFisico: this.modelo.espacioFisico.id, rango: true, desde: iniAgenda, hasta: finAgenda, estados: ['planificacion', 'disponible', 'publicada', 'pausada'] }).
                subscribe(agendas => {
                    let agds = agendas.filter(agenda => {
                        return agenda.id !== this.modelo.id || !this.modelo.id;
                    });
                    if (agds.length > 0) {

                        let ef = this.modelo.espacioFisico.nombre;
                        // + (this.modelo.espacioFisico.servicio.nombre !== '-' ? ', ' + this.modelo.espacioFisico.servicio.nombre : ' ') + (this.modelo.espacioFisico.edificio.descripcion ? ' (' + this.modelo.espacioFisico.edificio.descripcion + ')' : '');
                        if (this.modelo.espacioFisico.servicio && this.modelo.espacioFisico.servicio.nombre) {
                            ef = ef + this.modelo.espacioFisico.servicio.nombre;
                        }
                        if (this.modelo.espacioFisico.edificio && this.modelo.espacioFisico.edificio.descripcion) {
                            ef = ef + this.modelo.espacioFisico.edificio.descripcion;
                        }
                        alerta = 'El ' + ef + ' está asignado a otra agenda en ese rango horario';
                        if (this.alertas.indexOf(alerta) < 0) {
                            this.alertas = [... this.alertas, alerta];
                        }

                    }
                });
        }
        // Verifica que la hora inicio y hora fin de la agenda sean correctas
        if (iniAgenda && finAgenda) {
            if (iniAgenda > finAgenda) {
                this.alertas.push('La hora de inicio no puede ser mayor a la de fin');
            }
            if (iniAgenda === finAgenda) {
                this.alertas.push('La hora de inicio no puede igual a la de fin');
            }
        }

        // Verificaciones en cada bloque
        if (bloques) {
            bloques.forEach((bloque, index) => {

                let inicio = this.combinarFechas(this.fecha, bloque.horaInicio);
                let fin = this.combinarFechas(this.fecha, bloque.horaFin);

                if (bloque.cantidadTurnos && bloque.duracionTurno) {
                    totalBloques = totalBloques + (bloque.cantidadTurnos * bloque.duracionTurno);
                }
                if (this.compararFechas(iniAgenda, inicio) > 0 || this.compararFechas(finAgenda, fin) < 0) {
                    alerta = 'Bloque ' + (bloque.indice + 1) + ': Está fuera de los límites de la agenda';
                    indice = this.alertas.indexOf(alerta);
                    this.alertas.push(alerta);
                }

                if ((bloque.accesoDirectoDelDia + bloque.accesoDirectoProgramado + bloque.reservadoGestion + bloque.reservadoProfesional) > bloque.cantidadTurnos) {
                    alerta = 'Bloque ' + (bloque.indice + 1) + ': La cantidad de turnos asignados es mayor a la cantidad disponible';
                    this.alertas.push(alerta);
                }

                if ((bloque.accesoDirectoDelDia + bloque.accesoDirectoProgramado + bloque.reservadoGestion + bloque.reservadoProfesional) < bloque.cantidadTurnos) {
                    const cant = bloque.cantidadTurnos - (bloque.accesoDirectoDelDia + bloque.accesoDirectoProgramado + bloque.reservadoGestion + bloque.reservadoProfesional);
                    alerta = 'Bloque ' + (bloque.indice + 1) + ': Falta clasificar ' + cant + (cant === 1 ? ' turno' : ' turnos');
                    this.alertas = [... this.alertas, alerta];
                }

                if (this.compararFechas(inicio, fin) > 0) {
                    alerta = 'Bloque ' + (bloque.indice + 1) + ': La hora de inicio es mayor a la hora de fin';
                    this.alertas.push(alerta);
                }

                // Verifica que no se solape con ningún otro
                let mapeo = bloques.map(function (obj) {
                    if (obj.indice !== bloque.indice) {
                        let robj = {};
                        robj['horaInicio'] = obj.horaInicio;
                        robj['horaFin'] = obj.horaFin;
                        return robj;
                    } else {
                        return null;
                    }
                });

                mapeo.forEach((bloqueMap, index1) => {
                    if (bloqueMap) {
                        let bloqueMapIni = this.combinarFechas(this.fecha, bloqueMap.horaInicio);
                        let bloqueMapFin = this.combinarFechas(this.fecha, bloqueMap.horaFin);
                        // if (this.compararFechas(inicio, bloqueMapFin) < 0 && this.compararFechas(bloqueMapIni, inicio) < 0) {
                        if (this.compararFechas(bloqueMapIni, fin) < 0 && this.compararFechas(inicio, bloqueMapFin) < 0) {
                            alerta = 'El bloque ' + (bloque.indice + 1) + ' se solapa con el ' + (index1 + 1);
                            let alertaOpuesta = 'El bloque ' + (index1 + 1) + ' se solapa con el ' + (bloque.indice + 1);
                            if (this.alertas.indexOf(alertaOpuesta) < 0) {
                                this.alertas.push(alerta);
                            }
                        }
                    }
                });
            });
        }
    }

    combinarFechas(fecha1, fecha2) {
        if (fecha1 && fecha2) {
            let horas: number;
            let minutes: number;
            let auxiliar: Date;

            auxiliar = new Date(fecha1);
            horas = fecha2.getHours();
            minutes = fecha2.getMinutes();
            // Date.setHours(hour, min, sec, millisec)
            auxiliar.setHours(horas, minutes, 0, 0);
            return auxiliar;
        } else {
            return null;
        }
    }

    onSave($event, clonar: Boolean) {
        this.hideGuardar = true;
        if (this.dinamica) {
            this.modelo.dinamica = true;
            this.modelo.cupo = (this.setCupo) ? this.cupoMaximo : -1;
        }

        let arrayPrestaciones = new Array<ITipoPrestacion>();
        let bloqueConPrestActiva = false;
        let indice = 0;
        do {
            bloqueConPrestActiva = false;
            let bloque = this.modelo.bloques[indice];
            for (let j = 0; j < bloque.tipoPrestaciones.length; j++) {
                if (bloque.tipoPrestaciones[j].activo) {
                    bloqueConPrestActiva = true;

                    if (!arrayPrestaciones.find((p) => p.conceptId === bloque.tipoPrestaciones[j].conceptId)) {
                        arrayPrestaciones.push(bloque.tipoPrestaciones[j]);
                    }
                }
            }
            indice++;
        } while (bloqueConPrestActiva && indice < this.modelo.bloques.length);

        if ($event.formValid && this.verificarNoNominalizada() &&
            bloqueConPrestActiva &&
            arrayPrestaciones.length === this.modelo.tipoPrestaciones.length) {
            let espOperation: Observable<IAgenda>;
            this.fecha = new Date(this.modelo.fecha);
            this.modelo.horaInicio = this.combinarFechas(this.fecha, this.modelo.horaInicio);
            this.modelo.horaFin = this.combinarFechas(this.fecha, this.modelo.horaFin);

            // Si es una agenda nueva, no tiene ID y se genera un ID en '0' para el mapa de espacios físicos
            if (this.modelo.id === '0') {
                delete this.modelo.id;
            }

            this.modelo.organizacion = this.auth.organizacion;
            let bloques = this.modelo.bloques;

            bloques.forEach((bloque, index) => {
                bloque.horaInicio = this.combinarFechas(this.fecha, bloque.horaInicio);
                bloque.horaFin = this.combinarFechas(this.fecha, bloque.horaFin);
                bloque.turnos = [];
                bloque.turnosMobile = bloque.accesoDirectoProgramado > 0 ? bloque.turnosMobile : false;
                if (!this.dinamica) {
                    if (bloque.pacienteSimultaneos) {
                        bloque.restantesDelDia = bloque.accesoDirectoDelDia * bloque.cantidadSimultaneos;
                        bloque.restantesProgramados = bloque.accesoDirectoProgramado * bloque.cantidadSimultaneos;
                        bloque.restantesGestion = bloque.reservadoGestion * bloque.cantidadSimultaneos;
                        bloque.restantesProfesional = bloque.reservadoProfesional * bloque.cantidadSimultaneos;
                        bloque.restantesMobile = bloque.accesoDirectoProgramado > 0 ? bloque.cupoMobile * bloque.cantidadSimultaneos : 0;
                    } else {
                        bloque.restantesDelDia = bloque.accesoDirectoDelDia;
                        bloque.restantesProgramados = bloque.accesoDirectoProgramado;
                        bloque.restantesGestion = bloque.reservadoGestion;
                        bloque.restantesProfesional = bloque.reservadoProfesional;
                        bloque.restantesMobile = bloque.accesoDirectoProgramado > 0 ? bloque.cupoMobile : 0;
                    }

                    for (let i = 0; i < bloque.cantidadTurnos; i++) {
                        let turno = {
                            estado: 'disponible',
                            horaInicio: this.combinarFechas(this.fecha, new Date(bloque.horaInicio.getTime() + i * bloque.duracionTurno * 60000)),
                            tipoTurno: undefined
                        };

                        if (bloque.pacienteSimultaneos) {
                            // Simultaneos: Se crean los turnos según duración, se guardan n (cantSimultaneos) en c/ horario
                            for (let j = 0; j < bloque.cantidadSimultaneos; j++) {
                                bloque.turnos.push(turno);
                            }
                        } else {
                            if (bloque.citarPorBloque) {
                                // Citar x Bloque: Se generan los turnos según duración y cantidadPorBloque
                                for (let j = 0; j < bloque.cantidadBloque; j++) {
                                    turno.horaInicio = this.combinarFechas(this.fecha, new Date(bloque.horaInicio.getTime() + i * bloque.duracionTurno * bloque.cantidadBloque * 60000));
                                    if (turno.horaInicio.getTime() < bloque.horaFin.getTime()) {
                                        if (bloque.turnos.length < bloque.cantidadTurnos) {
                                            bloque.turnos.push(turno);
                                        }
                                    }
                                }
                            } else {
                                // Bloque sin simultaneos ni Citación por bloque
                                bloque.turnos.push(turno);
                            }
                        }
                    }
                }
                if (!this.dinamica) {
                    bloque.tipoPrestaciones = bloque.tipoPrestaciones.filter(function (el) {
                        return el.activo === true;
                    });
                }
            });

            // Si la agenda no es nominalizada, se limpia la posible información residual relacionada a turnos
            if (!this.modelo.nominalizada) {
                this.cleanDatosTurnos();
            }

            espOperation = this.serviceAgenda.save(this.modelo);
            espOperation.subscribe(resultado => {
                this.plex.toast('success', 'La agenda se guardó correctamente');
                this.modelo.id = resultado.id;
                if (clonar) {
                    this.showClonar = true;
                    this.showAgenda = false;
                } else {
                    this.modelo = {};
                    this.showAgenda = false;
                    this.volverAlGestor.emit(true);
                }
                this.hideGuardar = false;
            },
                (err) => { this.hideGuardar = false; });
        } else {
            if (!this.verificarNoNominalizada()) {
                this.plex.info('warning', 'Solo puede haber una prestación en las agendas no nominalizadas');
            } else if (!bloqueConPrestActiva) {
                this.plex.info('warning', 'Existe un bloque con todas sus prestaciones inactivas.');
            } else if (arrayPrestaciones.length !== this.modelo.tipoPrestaciones.length) {
                this.plex.info('warning', 'Por lo menos una de las prestaciones de la agenda está sin activar.');
            } else {
                this.plex.info('warning', 'Debe completar los datos requeridos');
            }
            this.hideGuardar = false;
        }
    }

    /**
     * Vuelve a cero todos los datos relacionados a cantidades de turnos de la agenda.
     * Aplica para agendas no nominalizadas, que pudieran tener datos residuales relacionados a turnos.
     *
     * @private
     * @memberof PlanificarAgendaComponent
     */
    private cleanDatosTurnos() {
        this.modelo.bloques.forEach(b => {
            b.accesoDirectoProgramado =
                b.accesoDirectoDelDia =
                b.cantidadTurnos =
                b.reservadoProfesional =
                b.reservadoGestion =
                b.restantesDelDia =
                b.restantesProgramados =
                b.restantesGestion =
                b.restantesProfesional =
                b.restantesMobile =
                b.mobile =
                b.duracionTurno = 0;

            b.turnos = [{
                estado: 'disponible',
                horaInicio: b.horaInicio,
                tipoPrestacion: b.tipoPrestaciones[0],
                tipoTurno: undefined
            }];
        });
    }

    cancelar() {
        this.volverAlGestor.emit(true);
        this.showAgenda = false;
    }

    onReturn(agenda: IAgenda): void {
        this.showAgenda = true;
        this.cargarAgenda(agenda);
    }

    /**
     * Verifica si es una agenda no nominalizada, en cuyo caso chequea que la agenda
     * tenga una sola prestación
     * @returns boolean TRUE/FALSE chequeos no nominalizada Ok
     * @memberof PlanificarAgendaComponent
     */
    verificarNoNominalizada() {
        let arrayTP = this.modelo.tipoPrestaciones;
        let indice = arrayTP.map(
            function (obj) {
                return obj.noNominalizada;
            }
        ).indexOf(true);
        if (indice === -1) {
            return true;
        } else {
            return (arrayTP.length === 1);
        }
    }
}

