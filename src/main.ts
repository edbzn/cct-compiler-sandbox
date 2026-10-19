import { Component } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

@Component({ selector: 'sb-root', template: '<h1>CCT compiler sandbox</h1>' })
class AppComponent {}

bootstrapApplication(AppComponent).catch((err) => console.error(err));
