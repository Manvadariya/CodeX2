from django.shortcuts import render
import os
import json
import tempfile
import subprocess
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from core.models import CodeExecution, CodeSnippet
from django.contrib.auth.models import User
from django.utils import timezone

def home_page(request):
    """
    View function for the home page of the site.
    """
    # You can add context data to pass to the template here
    context = {}
    
    # Render the HTML template home.html with the data in the context
    return render(request, 'home.html', context)

@csrf_exempt
def execute_code(request):
    """Execute code using Docker and return the output"""
    if request.method == 'POST':
        try:
            # Get code data from request
            data = json.loads(request.body)
            code = data.get('code', '')
            language = data.get('language', 'cpp')
            user_input = data.get('input', '')
            snippet_id = data.get('snippet_id')
            
            # Get code snippet if ID is provided
            code_snippet = None
            if snippet_id:
                try:
                    code_snippet = CodeSnippet.objects.get(id=snippet_id)
                except CodeSnippet.DoesNotExist:
                    pass
            
            # Create a temporary directory for all files
            temp_dir = tempfile.mkdtemp()
            
            # Map language name to file extension
            language_extensions = {
                'cpp': 'cpp',
                'python': 'py',
                'javascript': 'js',
                'java': 'java'
            }
            file_extension = language_extensions.get(language, language)
            
            # Set up file paths
            file_name = 'main'
            
            # For Java, extract the public class name and use it as the file name
            if language == 'java':
                import re
                public_class_match = re.search(r'public\s+class\s+(\w+)', code)
                if public_class_match:
                    file_name = public_class_match.group(1)
            
            code_file = os.path.join(temp_dir, f'{file_name}.{file_extension}')
            input_file = os.path.join(temp_dir, 'input.txt')
            output_file = os.path.join(temp_dir, 'output.txt')
            
            # Write code and input files
            with open(code_file, 'w') as f:
                f.write(code)
            
            with open(input_file, 'w') as f:
                f.write(user_input)
            
            # Build Docker image if not already built
            image_name = 'code_execution_env'
            docker_build_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            
            # Check if image exists
            check_image = subprocess.run(
                ['docker', 'images', '-q', image_name],
                capture_output=True, 
                text=True
            )
            
            if not check_image.stdout.strip():
                # Build the image
                subprocess.run(
                    ['docker', 'build', '-t', image_name, docker_build_path],
                    check=True
                )
            
            # Run code in Docker container with proper volume mounting
            docker_cmd = [
                'docker', 'run',
                '--rm',  # Remove container after execution
                '--memory=512m',  # Limit memory usage
                '--cpus=0.5',     # Limit CPU usage
                '--network=none', # Disable network access
                '--ulimit=nproc=50:100', # Limit number of processes
                '-v', f"{temp_dir}:/app/workspace",
                '--workdir', '/app/workspace',
                image_name,
                f'{file_name}.{file_extension}',
                'input.txt'
            ]
            
            try:
                result = subprocess.run(docker_cmd, capture_output=True, text=True, timeout=15)
            except subprocess.TimeoutExpired:
                return JsonResponse({
                    'status': 'error',
                    'message': 'Execution timed out - your code took too long to run'
                })
            
            # Read output
            output = "No output generated"
            try:
                with open(os.path.join(temp_dir, 'output.txt'), 'r') as f:
                    output = f.read()
            except FileNotFoundError:
                output = result.stdout if result.stdout else result.stderr
            
            # Create CodeExecution record
            execution_status = 'SUCCESS' if result.returncode == 0 else 'ERROR'
            
            # Always save the code execution, even for anonymous users
            if not code_snippet and request.user.is_authenticated:
                # Create a temporary snippet if user is logged in but no snippet was specified
                code_snippet = CodeSnippet.objects.create(
                    title=f"Temporary Execution - {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}",
                    language=language,
                    owner=request.user,
                    code_content=code
                )
            
            if code_snippet:
                CodeExecution.objects.create(
                    code=code_snippet,
                    code_snapshot=code,
                    execution_result=output,
                    execution_status=execution_status
                )
            
            # Clean up temporary files
            try:
                os.remove(code_file)
                os.remove(input_file)
                if os.path.exists(output_file):
                    os.remove(output_file)
                os.rmdir(temp_dir)
            except Exception as e:
                print(f"Cleanup error: {e}")
            
            return JsonResponse({
                'status': 'success',
                'output': output,
                'stderr': result.stderr
            })
            
        except Exception as e:
            return JsonResponse({
                'status': 'error',
                'message': str(e)
            })
    
    return JsonResponse({'status': 'error', 'message': 'Invalid request method'})
