import { Component, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { LanguageService } from '../../core/i18n/language.service';

/**
 * Login screen layout only (Phase 1). It does NOT log anyone in: no OTP is sent
 * and nothing is checked. Real mobile OTP login, verified by the API, comes in Phase 2.
 */
@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    TranslocoDirective,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  protected readonly language = inject(LanguageService);
  private readonly router = inject(Router);

  protected readonly step = signal<'phone' | 'otp'>('phone');
  private readonly phoneInput = viewChild<ElementRef<HTMLInputElement>>('phoneInput');
  private readonly otpInput = viewChild<ElementRef<HTMLInputElement>>('otpInput');

  constructor() {
    // Keep keyboard focus in the right field on every step (keyboard-first rule).
    // viewChild() is a signal, so this re-runs when the step's input appears.
    effect(() => {
      const input = this.step() === 'phone' ? this.phoneInput() : this.otpInput();
      input?.nativeElement.focus();
    });
  }
  /** Indian mobile: 10 digits starting 6-9. */
  protected readonly phone = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)],
  });
  protected readonly otp = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{6}$/)],
  });
  // Each step's <form> binds a FormGroup so (ngSubmit) fires and the browser's
  // own submit (a full page reload) is prevented.
  protected readonly phoneForm = new FormGroup({ phone: this.phone });
  protected readonly otpForm = new FormGroup({ otp: this.otp });

  protected sendOtp(): void {
    this.phone.markAsTouched();
    if (this.phone.invalid) return;
    this.step.set('otp');
  }

  protected verify(): void {
    this.otp.markAsTouched();
    if (this.otp.invalid) return;
    // Placeholder until Phase 2: go to the app without any real check.
    void this.router.navigateByUrl('/home');
  }

  protected changeNumber(): void {
    this.otp.reset();
    this.step.set('phone');
  }
}
