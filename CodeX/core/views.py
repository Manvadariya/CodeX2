from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.forms import UserCreationForm
from django.contrib import messages
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
import json
from .models import CodeSnippet, AIAssistance
import uuid
from openai import OpenAI
from django.utils import timezone
import re

API_KEY = "ddc-XhP8nw45hLm9VWdknctmJv00BfgdlN1Ba9ymPAv4qcMEvD6Gn9"
BASE_URL = "https://api.sree.shop/v1"

client = OpenAI(
    api_key=API_KEY,
    base_url=BASE_URL
)

def chat_with_gpt(prompt, chat_history):
    messages = [
        {
            "role": "system",
            "content": ("You are a specialized code assistant. Your job is to help users troubleshoot and fix code errors, "
                        "generate new code based on requirements, and suggest improvements to increase efficiency. "
                        "Provide clear, step-by-step guidance and sample code where applicable. "
                        "You are also a specialized code assistant for Python, JavaScript, and C++, Java. "
                        "Your primary goal is to assist users in writing and debugging code in shortest and summarized response possible.")
        }
    ] + chat_history + [
        {
            "role": "user",
            "content": prompt
        }
    ]
    
    try:
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=1.0,
            top_p=1.0,
            max_tokens=1000,
            stream=False,
        )
        return completion.choices[0].message.content
    except Exception as e:
        return f"Error: {e}"

# Create your views here.
def login_page(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            return redirect('dashboard')
        else:
            messages.error(request, 'Invalid username or password.')
    return render(request, 'login.html')

def register(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            form.save()
            username = form.cleaned_data.get('username')
            messages.success(request, f'Account created for {username}! You can now log in.')
            return redirect('login_page')
    else:
        form = UserCreationForm()
    return render(request, 'register.html', {'form': form})

@login_required
def dashboard(request):
    user_snippets = CodeSnippet.objects.filter(owner=request.user).order_by('-created_at')
    context = {
        'snippets': user_snippets,
        'user': request.user
    }
    return render(request, 'deshboard.html', context)

@login_required
def create_code(request):
    if request.method == 'POST':
        title = request.POST.get('title')
        description = request.POST.get('description')
        language = request.POST.get('language')
        code_content = request.POST.get('code_content')
        user_input = request.POST.get('user_input', '')
        requirements = request.POST.get('requirements', '')
        
        # Create new code snippet
        snippet = CodeSnippet(
            title=title,
            description=description,
            language=language,
            code_content=code_content,
            user_input=user_input,
            requirements=requirements,
            owner=request.user
        )
        snippet.save()
        
        return redirect('code_detail', pk=snippet.id)
    
    # For GET requests, render the main.html template with the code editor
    languages = [choice[0] for choice in CodeSnippet._meta.get_field('language').choices]
    context = {
        'languages': languages,
        'user': request.user
    }
    return render(request, 'main.html', context)

@login_required
def code_detail(request, pk):
    snippet = get_object_or_404(CodeSnippet, pk=pk, owner=request.user)
    return render(request, 'code_detail.html', {'snippet': snippet})

def logout_view(request):
    logout(request)
    return redirect('home_page')

@login_required
def delete_code(request, pk):
    snippet = get_object_or_404(CodeSnippet, pk=pk, owner=request.user)
    if request.method == 'POST':
        snippet.delete()
        messages.success(request, f'Code "{snippet.title}" has been deleted successfully.')
    return redirect('dashboard')

def shared_code(request, pk):
    snippet = get_object_or_404(CodeSnippet, pk=pk)
    return render(request, 'shared_code.html', {'snippet': snippet})

@login_required
def chat_api(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        prompt = data.get('prompt')
        chat_history = data.get('chat_history', [])
        code_id = data.get('code_id')
        
        if not prompt:
            return JsonResponse({'error': 'Prompt is required'}, status=400)
        
        # Get code snippet if ID is provided
        code_snippet = None
        if code_id:
            try:
                code_snippet = CodeSnippet.objects.get(id=code_id)
            except CodeSnippet.DoesNotExist:
                pass
        
        # Extract actual code content from the prompt for storage
        code_content = ""
        try:
            # Try to extract code from the prompt which typically follows a pattern like:
            # I'm working with the following code:
            # ```python
            # def hello():
            #     print("hello world")
            # ```
            code_match = re.search(r'```(?:\w+)?\n(.*?)\n```', prompt, re.DOTALL)
            if code_match:
                code_content = code_match.group(1)
        except Exception:
            # If extraction fails, don't prevent the API from functioning
            pass
        
        # If no code snippet exists but user is querying about code, create a temporary one
        if not code_snippet and code_content and request.user.is_authenticated:
            # Try to determine language from the prompt
            language = 'python'  # Default
            language_match = re.search(r'```(\w+)', prompt)
            if language_match:
                detected_lang = language_match.group(1).lower()
                if detected_lang in ['python', 'py']:
                    language = 'python'
                elif detected_lang in ['javascript', 'js']:
                    language = 'javascript'
                elif detected_lang in ['cpp', 'c++']:
                    language = 'cpp'
                elif detected_lang in ['java']:
                    language = 'java'
            
            code_snippet = CodeSnippet.objects.create(
                title=f"AI Chat Snippet - {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
                language=language,
                owner=request.user,
                code_content=code_content
            )
        
        response = chat_with_gpt(prompt, chat_history)
        
        # Create AIAssistance record
        AIAssistance.objects.create(
            user=request.user,
            code=code_snippet,
            prompt=prompt,
            response=response
        )
        
        return JsonResponse({
            'response': response
        })
    
    return JsonResponse({'error': 'Only POST method is allowed'}, status=405)
