# Terraform: Provision an EC2 Instance

Goal: end up with one running Ubuntu EC2 instance, reachable over SSH and on
ports 80/443 (and temporarily 8000/3000 while testing), that Ansible can then
configure. This guide has you write the Terraform yourself — nothing here is
pre-built — so you understand every resource it creates.

## 1. Prerequisites

- [Install Terraform](https://developer.hashicorp.com/terraform/install)
  (`terraform -version` to confirm).
- [Install the AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
  and run `aws configure` with an IAM user's access key that has permission
  to manage EC2 (for a personal project, `AmazonEC2FullAccess` is fine to
  start with; tighten later).
- An SSH key pair. If you don't have one you're happy to use:
  `ssh-keygen -t ed25519 -f ~/.ssh/snakegame-key` (creates a private +
  `.pub` file).

## 2. Directory layout to create

Inside `devops/terraform/`, create:

```
devops/terraform/
├── main.tf          # provider + resources
├── variables.tf     # input variables
├── outputs.tf        # the server's public IP, printed after apply
└── terraform.tfvars  # your actual values (gitignored — see step 6)
```

## 3. `variables.tf` — what to declare

Declare variables for: `aws_region` (e.g. `us-east-1`), `instance_type`
(e.g. `t3.micro`), `key_name` (the AWS key pair name — see step 4), and
`ssh_allowed_cidr` (your own IP in `x.x.x.x/32` form, so SSH isn't open to
the whole internet — check yours at `curl ifconfig.me`).

## 4. Import your SSH key into AWS

Either via the console (EC2 → Key Pairs → Import) or CLI:

```bash
aws ec2 import-key-pair \
  --key-name snakegame-key \
  --public-key-material fileb://~/.ssh/snakegame-key.pub
```

Use `snakegame-key` as the `key_name` variable value.

## 5. `main.tf` — resources to define

1. **`provider "aws"`** — region from `var.aws_region`.
2. **A security group** allowing inbound: TCP 22 (SSH) from
   `var.ssh_allowed_cidr` only, TCP 80 and 443 from `0.0.0.0/0` (public web
   traffic), and — only while you're first testing before nginx/TLS is in
   front of everything — TCP 3000 and 8000 from `var.ssh_allowed_cidr`.
   Allow all outbound traffic.
3. **A `data "aws_ami"` lookup** for the latest Ubuntu 22.04 LTS AMI (owner
   `099720109477`, name pattern
   `ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*`), so you're not
   hardcoding an AMI ID that goes stale.
4. **An `aws_instance`** using that AMI, `var.instance_type`, `var.key_name`,
   the security group from step 2, and a root volume of at least 20GB
   (`root_block_device { volume_size = 20 }`) — Docker images add up.
5. Tag the instance (`Name = "snakegame"`) so it's identifiable in the
   console.

## 6. `outputs.tf`

Output the instance's `public_ip` so it prints after `apply` and can be
piped straight into the Ansible inventory (next guide).

## 7. Fill in `terraform.tfvars` and keep it out of git

```hcl
aws_region       = "us-east-1"
instance_type    = "t3.micro"
key_name         = "snakegame-key"
ssh_allowed_cidr = "YOUR.IP.HERE/32"
```

Add `devops/terraform/terraform.tfvars` and `devops/terraform/.terraform/`
and `devops/terraform/*.tfstate*` to the repo's `.gitignore` — the state
file can contain sensitive data and the `.tfvars` file is environment-
specific.

## 8. Run it

```bash
cd devops/terraform
terraform init      # downloads the AWS provider
terraform plan       # review what it's about to create — read this output
terraform apply       # type "yes" when prompted
```

Note the `public_ip` in the output — you'll need it for the Ansible guide.

## 9. Verify

```bash
ssh -i ~/.ssh/snakegame-key ubuntu@<public_ip>
```

You should get a shell on a fresh Ubuntu box with nothing installed yet —
that's expected, Ansible handles the rest.

## 10. Tearing it down

When you're done experimenting (to stop paying for it):

```bash
terraform destroy
```

## Notes / things to double-check

- **Terraform state**: for a solo project, local state (the default) is
  fine. If you ever work on this with others, move to a remote backend
  (S3 + DynamoDB lock table) so two people don't apply conflicting changes.
- **Cost**: `t3.micro` is within the AWS free tier for the first 12 months
  on a new account; otherwise it's a few dollars/month. `terraform destroy`
  when not actively using it.
- **Elastic IP**: the public IP from a plain `aws_instance` changes if the
  instance is stopped/started. If you want a stable IP across restarts, add
  an `aws_eip` resource and associate it with the instance.
