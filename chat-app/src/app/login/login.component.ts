import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  isEmailMode: boolean = false;
  isUserNameMode: boolean = false
  contact: string = '';
  username: string = '';
  validationMessage: string = '';
  isValidUserId: boolean = false;

  constructor(
      private http: HttpClient,
      private router: Router
  
    ) {}
  

  loginChangeAction() {
    this.isEmailMode = !this.isEmailMode;
  }

  registernewUserAction(){
    this.router.navigate(['/register']);
  }

  nextAction() {
    if (!this.isUserNameMode) {
      this.http.post<any>('http://localhost:3000/check-contact', { contact: this.contact }).subscribe((res) => {
        if (res.username) {
          localStorage.setItem('username', res.username);
          this.validationMessage = ''; 
          this.isValidUserId = false;
          this.router.navigate(['/chat-list']);
        } else {
          this.validationMessage = '';  
        this.isValidUserId = false;         
          this.isUserNameMode = true;
        }
      }, (err) => {
        alert('Invalid Contact');
      });
    } else {
      this.http.post('http://localhost:3000/save-username', { contact: this.contact, username: this.username }).subscribe(() => {
        alert('✅ Username created successfully!');
        localStorage.setItem('username', this.username);
        this.validationMessage = '';  
        this.isValidUserId = false;
        this.router.navigate(['/chat-list']);
      }, (err) => {
        alert('Error saving username');
      });
    }
  }

  isValidMobileNumber(number: string): boolean {
    const mobileRegex = /^[6-9]\d{9}$/;  // Indian format example
    return mobileRegex.test(number);
  }
  
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidInput(): boolean {
    if (this.isUserNameMode) {
      return this.username.trim().length > 0;
    } else if (this.isEmailMode) {
      return this.contact.trim().length > 0 && this.isValidEmail(this.contact);
    } else {
      return this.contact.trim().length > 0 && this.isValidMobileNumber(this.contact);
    }
  }
  
  validateContact() {
    const trimmedContact = this.contact.trim();
  
    if (!trimmedContact) {
      this.validationMessage = '';
      this.isValidUserId = false;
      return;
    }
  
    const isValidFormat = this.isEmailMode
      ? this.isValidEmail(trimmedContact)
      : this.isValidMobileNumber(trimmedContact);
  
    if (!isValidFormat) {
      this.validationMessage = this.isEmailMode
        ? 'Please enter your registered email address'
        : 'Please enter your registered mobile number';
      this.isValidUserId = false;
      return;
    }
  
    // Format is valid — now check with backend
    this.http.post<any>('http://localhost:3000/check-contact-exist', { contact: trimmedContact })
      .subscribe(
        (res) => {
          if (res.exists) {
            this.validationMessage = '✅ User ID is valid';
            this.isValidUserId = true;
          } else {
            this.validationMessage = 'User ID not found';
            this.isValidUserId = false;
          }
        },
        (err) => {
          this.validationMessage = 'Server error. Try again later.';
          this.isValidUserId = false;
        }
      );
  }

  validateUsername() {
    const trimmedUsername = this.username.trim();
  
    if (!trimmedUsername) {
      this.validationMessage = 'Username is required';
      this.isValidUserId = false;
      return;
    }
  
    this.http.post<any>('http://localhost:3000/check-username', { username: trimmedUsername }).subscribe(
      (res) => {
        if (res.exists) {
          this.validationMessage = 'Username is already taken. Please choose a unique name.';
          this.isValidUserId = false;
        } else {
          this.validationMessage = '✅Unique Name';
          this.isValidUserId = true;
        }
      },
      (err) => {
        console.error('Error checking username', err);
        this.validationMessage = err?.error?.message || 'Error checking username.';
        this.isValidUserId = false;
      }
    );
  }
  
  


  

}
