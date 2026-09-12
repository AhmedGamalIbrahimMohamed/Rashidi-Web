import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiFailure } from '../../core/models/api.model';
import { ContactService } from '../../core/services/contact.service';
import { ContentService } from '../../core/services/content.service';
import { I18nService } from '../../core/services/i18n.service';
import { SeoService } from '../../core/services/seo.service';
import { RevealDirective } from '../../shared/directives/reveal.directive';

@Component({
  selector: 'app-about-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RevealDirective],
  templateUrl: './about-contact.component.html',
  styleUrl: './about-contact.component.scss',
})
export class AboutContactComponent {
  protected readonly i18n = inject(I18nService);
  private readonly content = inject(ContentService);
  private readonly contactService = inject(ContactService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  protected readonly about = this.content.about;
  protected readonly contact = this.content.contact;
  protected readonly social = this.content.social;

  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly errorMessage = signal('');

  /** Set when the visitor arrived from a machine's "Contact Us" button. */
  private readonly machineId = signal<string | null>(null);

  protected readonly form: FormGroup = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(180)]],
    phone: ['', [Validators.maxLength(40)]],
    subject: ['', [Validators.required, Validators.maxLength(180)]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(4000)]],
    // Honeypot — hidden from people, irresistible to bots.
    website: [''],
  });

  protected readonly phoneHref = computed(() =>
    (this.contact()?.phone ?? '').replace(/[^\d+]/g, ''),
  );

  protected readonly whatsappHref = computed(() => {
    const number = (this.contact()?.whatsapp ?? '').replace(/[^\d]/g, '');
    return number ? `https://wa.me/${number}` : null;
  });

  constructor() {
    // A machine page can deep-link here with a prefilled subject.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const subject = params.get('subject');
      const machine = params.get('machine');
      if (subject) this.form.patchValue({ subject });
      this.machineId.set(machine);
    });

    effect(() => {
      const about = this.about();
      this.seo.apply({
        title: this.i18n.dict().nav.about,
        description: SeoService.truncate(about?.lead ?? about?.paragraphs?.[0] ?? ''),
        path: '/about',
        type: 'website',
      });
    });
  }

  /** Shows an error only once the field has been touched, never while typing. */
  protected invalid(field: string): boolean {
    const control = this.form.get(field);
    return Boolean(control && control.invalid && (control.touched || control.dirty));
  }

  protected errorFor(field: string): string {
    const control = this.form.get(field);
    if (!control || control.valid) return '';

    const messages = this.i18n.dict().contact.validation;

    switch (field) {
      case 'name':
        return messages.nameRequired;
      case 'email':
        return control.hasError('required') ? messages.emailRequired : messages.emailInvalid;
      case 'subject':
        return messages.subjectRequired;
      case 'message':
        return control.hasError('required') ? messages.messageRequired : messages.messageShort;
      default:
        return '';
    }
  }

  protected submit(): void {
    this.errorMessage.set('');

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      // Move focus to the first problem so keyboard and screen-reader users are
      // not left guessing why nothing happened.
      const firstInvalid = Object.keys(this.form.controls).find((key) =>
        this.form.get(key)?.invalid,
      );
      if (firstInvalid) {
        document.querySelector<HTMLElement>(`[formControlName="${firstInvalid}"]`)?.focus();
      }
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue();

    this.contactService
      .send({
        name: value.name,
        email: value.email,
        phone: value.phone || null,
        subject: value.subject,
        message: value.message,
        machineId: this.machineId(),
        locale: this.i18n.locale(),
        website: value.website,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.sent.set(true);
          this.form.reset();
        },
        error: (failure: ApiFailure) => {
          this.submitting.set(false);
          this.errorMessage.set(failure.message || this.i18n.dict().contact.failed);
        },
      });
  }

  protected sendAnother(): void {
    this.sent.set(false);
    this.errorMessage.set('');
  }
}
