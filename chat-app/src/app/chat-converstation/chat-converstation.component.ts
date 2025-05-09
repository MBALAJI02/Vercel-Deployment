import { AfterViewChecked, Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { io, Socket } from 'socket.io-client';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-chat-conversation',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, MenuModule, ButtonModule],
  templateUrl: './chat-converstation.component.html',
  styleUrls: ['./chat-converstation.component.css']
})
export class ChatConverstationComponent implements AfterViewChecked {
  @ViewChild('scrollMe') private scrollContainer!: ElementRef;

  username: string = '';
  messages: { text: string; sender: 'user' | 'bot'; time: string }[] = [];
  newMessage = '';
  isTyping = false;
  menuVisible = false;
  menuItems: MenuItem[] = [];

  private socket!: Socket;
  private currentUser: string | null = localStorage.getItem('username');

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {
  }

  ngOnInit() {
    this.username = this.route.snapshot.paramMap.get('id') || '';
    this.socket = io('http://localhost:4000');

    if (this.currentUser) {
      this.socket.emit('join', this.currentUser);
    }

    this.socket.on('receive_message', (data) => {
      if (data.from == this.username) {
        this.messages.push({
          text: data.message,
          sender: 'bot',
          time: new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: 'numeric'
          })
        });
      }
    });

    this.fetchUserMessage();
    this.liveTypingUpdate();
    this.menuDropDownAction();  

  }

  fetchUserMessage() {
    // Fetch chat messages from the DB
    this.http.get<any[]>(`http://localhost:3000/get-messages/${this.currentUser}/${this.username}`)
      .subscribe(
        data => {
          this.messages = data.map(msg => ({
            text: msg.message,
            sender: msg.from == this.currentUser ? 'user' : 'bot',
            time: new Date(msg.timestamp).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: 'numeric'
            })
          }));
        },
        err => console.error('Message fetch error:', err)
      );
  }

  liveTypingUpdate() {
    this.socket.on('user_typing', (data) => {
      if (data.from == this.username) {
        this.isTyping = true;
        setTimeout(() => this.isTyping = false, 3000);
      }
    });
  }

  ngAfterViewChecked() {    
    this.scrollToBottom()
  }

  scrollToBottom() {
    if (this.scrollContainer && this.scrollContainer.nativeElement && this.scrollContainer.nativeElement.scrollHeight !== undefined) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    }
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto'; // Reset height
    textarea.style.height = Math.min(textarea.scrollHeight, 100) + 'px'; // Max 4 lines (approx 100px)
  }
  

  sendMessage(textarea: HTMLTextAreaElement) {
    const currentUser = this.currentUser;
    const to = this.username;

    if (!currentUser || !to || !this.newMessage.trim()) {
      console.warn('Invalid data:', { currentUser, to, newMessage: this.newMessage });
      return;
    }

    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric'
    });

    console.log('Sending message:', { from: currentUser, to, message: this.newMessage });

    this.messages = [...this.messages, { text: this.newMessage, sender: 'user', time: currentTime }];

    this.http.post('http://localhost:3000/send-message', {
      from: currentUser,
      to: this.username,
      message: this.newMessage
    }).subscribe(
      response => {
        console.log('Message sent:', response);
      },
      error => {
        console.error('Message send error:', error);
      }
    );

    this.socket.emit('send_message', {
      to: this.username,
      from: currentUser,
      message: this.newMessage,
      time: currentTime
    });

    this.socket.emit('send_unread_count', {
      from: this.currentUser,
      to: this.username,
      message: this.newMessage,

    })

    this.newMessage = '';
    textarea.style.height = 'auto';
  }

  onTyping() {
    if (this.currentUser && this.username) {
      this.socket.emit('typing', { from: this.currentUser, to: this.username });
    }
  }

  menuDropDownAction() {
    this.menuItems = [
      { label: 'View Contact', command: () => this.viewContact() },
      { label: 'Clear Chat', command: () => this.clearChat() },
      { label: 'Block Contact', command: () => this.blockContact() },
      { label: 'Delete Contact', command: () => this.deleteContact() },
      { label: 'More', command: () => this.showMoreOptions() }
    ];
  }

  threeDotMenu() {
    this.menuVisible = !this.menuVisible;
  }

  viewContact() {
    console.log('View Contact clicked');
    // Show modal or navigate
  }

  clearChat() {
    if (!this.currentUser || !this.username) return;

    this.http.delete(`http://localhost:3000/clear-message/${this.currentUser}/${this.username}`, {
      responseType: 'text'
    }).subscribe(
      () => {
        console.log('Message clear from db sucessfully');
        this.router.navigate(['/chat-list']);
      },
      error => {
        console.error('Message clear failed:', error);
      }
    );
  }

  blockContact() {
    console.log('Blocked contact');
    // Block logic
  }

  deleteContact() {   

  }

  showMoreOptions() {
    console.log('More options clicked');
    // Additional actions
  }



  backAction() {
    this.router.navigate(['/chat-list']);
  }


}
