import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

// Providers
import { EstAgendasService } from './services/agenda.service';
import { SolicitudesTopService } from './services/top.service';

// Components
import { HomeComponent } from './components/home.component';
import { FiltrosComponent } from './components/citas/filtros.component';
import { GraficosComponent } from './components/citas/graficos.component';
import { FiltrosSolicitudesComponent } from './components/top/filtrosSolicitudes.component';

// Module
import { PlexModule } from '@andes/plex';
import { AuthModule } from '@andes/auth';
import { ChartsModule } from 'ng2-charts';
import { HttpClientModule } from '@angular/common/http';
import { HttpModule } from '@angular/http';
import { CitasComponent } from './components/citas/citas.component';
import { EstadisticasRouting } from './estadisticas.routing';
import { CommonModule } from '@angular/common';
import { EstRupService } from './services/rup-estadisticas.service';
import { RupPacientesComponent } from './components/rup/rup-pacientes.component';
import { SnomedService } from './services/snomed.service';
import { Tabla2DComponent } from './components/tabla-2d/tabla-2d.component';
import { TopComponent } from './components/top/top.component';
import { SumPipe } from './pipes/sum.pipe';

@NgModule({
    imports: [
        CommonModule,
        PlexModule,
        AuthModule,
        ChartsModule,
        FormsModule,
        HttpClientModule,
        HttpModule,
        EstadisticasRouting
    ],
    declarations: [
        SumPipe,
        HomeComponent,
        FiltrosComponent,
        FiltrosSolicitudesComponent,
        CitasComponent,
        RupPacientesComponent,
        GraficosComponent,
        Tabla2DComponent,
        TopComponent
    ],
    entryComponents: [
        HomeComponent,
        FiltrosComponent,
        FiltrosSolicitudesComponent,
        CitasComponent,
        RupPacientesComponent,
        GraficosComponent
    ],
    exports: [],
    providers: [
        EstAgendasService,
        EstRupService,
        SnomedService,
        SolicitudesTopService
    ]
})
export class EstadisticaModule {
}
