output "public_ip" {
  description = "Public IP of the Snake game server (feed this into the Ansible inventory)"
  value       = aws_instance.snakegame.public_ip
}

output "ssh_command" {
  description = "Ready-to-use SSH command"
  value       = "ssh -i ~/.ssh/snakegame-key ubuntu@${aws_instance.snakegame.public_ip}"
}
