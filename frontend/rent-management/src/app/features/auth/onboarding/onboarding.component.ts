import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  imports: [CommonModule],
  selector: 'app-onboarding',
  styleUrl: './onboarding.component.scss',
  templateUrl: './onboarding.component.html',
})
export class OnboardingComponent implements OnInit {
  invitationToken: string | null = null;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.invitationToken = params['token'];
    });
  }

  goToRegistration(): void {
    this.router.navigate(['/auth/login'], { queryParams: { token: this.invitationToken }});
  }
}
