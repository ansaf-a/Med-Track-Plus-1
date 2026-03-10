import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdherenceSimulatorComponent } from './adherence-simulator.component';

describe('AdherenceSimulatorComponent', () => {
  let component: AdherenceSimulatorComponent;
  let fixture: ComponentFixture<AdherenceSimulatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdherenceSimulatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdherenceSimulatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
